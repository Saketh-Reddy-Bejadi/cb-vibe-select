# PicScope — Product Requirements Document (PRD)

## 1. Executive Summary & Vision
**PicScope** is an enterprise AI-powered visual intelligence and photo discovery platform. It connects to organizational **Microsoft 365 (OneDrive & SharePoint)** repositories, recursively indexes images, extracts rich visual intelligence (face recognition, object detection, EXIF metadata, semantic embeddings) via a dedicated Hugging Face AI backend, and provides users with a fast, permission-aware natural language and people search engine.

---

## 2. Core Architecture & Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend & Backend** | Next.js (App Router), React 19, TypeScript | Server Components, Server Actions & API Routes |
| **Styling** | Tailwind CSS | Modern enterprise dark/light theme, responsive |
| **Database & Vector** | PostgreSQL + `pgvector` extension | Relational tables + cosine similarity vector search |
| **ORM** | Prisma ORM | Type-safe schema migrations and client |
| **Auth & Identity** | NextAuth.js / Auth.js (Microsoft Entra ID SSO) | Work/School account sign-in |
| **Cloud Repository** | Microsoft Graph API (App Registration) | Application permissions (`Files.Read.All`, `Sites.Read.All`) |
| **AI Inference** | Hugging Face Space (Gradio Client) | Private space (`HF_TOKEN`) returning faces, objects, embeddings |
| **Job Queue** | Postgres-backed background worker queue | Multi-step folder ingestion, batching, retry logic |
| **Live Progress** | Server-Sent Events (SSE) | Real-time progress updates for admins |

---

## 3. User Roles & Access Control (RBAC)

### 3.1 Role Hierarchy
1. **Owner** (`OWNER_EMAIL` configured via environment variables):
   - Superuser access.
   - Authorize users and assign roles (`Owner`, `Admin`, `User`).
   - Configure global system settings (Hugging Face endpoint & token, Azure credentials).
   - Manage the **Global Permission Enforcing Toggle**.
2. **Admin**:
   - Paste SharePoint / OneDrive folder URLs to trigger scanning and indexing.
   - Configure per-folder settings (recursive subfolder crawl, per-folder permission override).
   - Monitor real-time indexing progress and job status (active, completed, failed items).
   - Trigger folder re-scans to ingest newly added photos.
   - Review and manage indexed folder list.
3. **User**:
   - Access the User Search & Discovery panel.
   - Search by people names (with smart autocomplete recommendations).
   - Search by natural language prompts, objects, EXIF locations, and date ranges.
   - View images (subject to the permission policy).
   - Open full-resolution images directly in SharePoint/OneDrive or download them.

### 3.2 Permission Enforcement Toggle
PicScope enforces organizational security using a two-tier permission toggle:
- **Global Default Toggle (Owner Settings)**:
  - *Strict Mode (Default)*: Users can only see and search images located in folders they have read access to on SharePoint/OneDrive.
  - *Open Tenant Mode*: All indexed company photos are discoverable by any authenticated employee.
- **Per-Folder Override (Admin Ingestion)**:
  - Admins can designate specific folders as publicly discoverable company-wide (e.g., All-Hands, Company Offsite, Marketing Assets) even when global strict mode is enabled.
- **Permission Verification Mechanism**:
  - In Strict Mode, the system queries Microsoft Graph using the user's Entra ID identity to verify drive item permissions before returning search results.

---

## 4. Ingestion & AI Processing Pipeline

### 4.1 Folder Submission & Ingestion Flow
1. **Link Resolution**: Admin inputs a SharePoint site/folder link or OneDrive shared folder link.
2. **Graph Traversal**: The backend calls Microsoft Graph API using Application Permissions (Client ID + Secret/Certificate) to resolve the `driveItem`.
3. **Filtering & Deduplication**:
   - Recursively traverses subfolders (if recursive toggle is enabled).
   - Filters only supported image MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/tiff`).
   - Deduplicates against existing items using Graph Item ID and file content hashes (`eTag` / SHA256).
4. **Queue Dispatch**: Files are enqueued into a Postgres-backed background processing queue.

### 4.2 AI Analysis Pipeline (Per Image)
1. **Fetch Image Stream**: Worker pulls image content via Microsoft Graph API.
2. **Hugging Face Gradio Processing**:
   - Worker sends image to private Hugging Face Gradio endpoint with `HF_TOKEN`.
   - Backend performs:
     - **Face Recognition**: Identifies seeded known people, labels unknown faces, outputs bounding boxes and confidence scores.
     - **Object & Scene Detection**: Returns labeled objects and visual concepts.
     - **Visual Vector Embeddings**: Outputs high-dimensional embeddings (e.g., CLIP) for semantic similarity.
3. **EXIF Metadata Extraction**:
   - Extracts camera model, timestamp, GPS coordinates (latitude, longitude, altitude).
   - Reverse-geocodes GPS coordinates to city/country/place metadata when available.
4. **Database Storage**:
   - Image metadata, detected face entities, object tags, and vector embeddings are indexed in PostgreSQL (`pgvector`).
5. **Live Progress Tracking**:
   - Worker emits SSE events to the Admin Panel (`total_files`, `processed_files`, `failed_files`, `current_file_name`).

---

## 5. Image Delivery & Thumbnail Optimization
- **Gallery Previews**: PicScope queries Microsoft Graph's built-in thumbnail endpoint (`/drive/items/{id}/thumbnails/0/medium/content` or `large/content`). This eliminates local storage overhead and delivers fast, CDN-cached previews.
- **Full Resolution View**: Clicking an image opens a preview modal with metadata, detected faces overlay, and a direct action to **"Open in SharePoint/OneDrive"** or generate a temporary secure download URL via Graph API.

---

## 6. User Discovery & Search Experience

### 6.1 Multi-Modal Search Interface
- **People Autocomplete & Recommendation**:
  - Search input provides instant autocomplete suggestions of known people.
  - Users can select multiple individuals (e.g., photos containing both "Alice" and "Bob").
- **Natural Language & Visual Search**:
  - Accepts freeform semantic queries (e.g., *"annual hackathon stage celebration"*, *"team dinner on the beach"*).
  - Uses `pgvector` cosine similarity against visual embeddings to rank matching photos.
- **Filter Controls**:
  - **Date Range**: Filter by captured date (extracted from EXIF) or indexed date.
  - **Location**: Filter by recognized place / city or GPS bounding area.
  - **Source Folder**: Filter by specific SharePoint site or OneDrive folder.
  - **Object Tags**: Select from detected object labels (e.g., *laptop*, *whiteboard*, *cake*).

### 6.2 Search Results Grid & Inspector Modal
- Responsive masonry/grid layout with thumbnail previews.
- Interactive image inspector modal:
  - Full-resolution preview.
  - Face bounding boxes with recognized names.
  - Detected objects and tags.
  - Date taken, camera info, and location map/pin.
  - Direct links: *"Open in SharePoint"*, *"Copy Link"*, *"Download"*.

---

## 7. Database Schema Design (PostgreSQL + Prisma)

### 7.1 Key Entities
- **`User`**: `id`, `name`, `email`, `role` (`OWNER`, `ADMIN`, `USER`), `createdAt`, `updatedAt`
- **`Folder`**: `id`, `graphDriveId`, `graphItemId`, `webUrl`, `name`, `isPublicOverride`, `lastSyncedAt`, `createdById`
- **`Job`**: `id`, `folderId`, `status` (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`), `totalItems`, `processedItems`, `failedItems`, `errorLog`, `createdAt`
- **`Image`**: `id`, `graphItemId`, `folderId`, `fileName`, `mimeType`, `sizeBytes`, `capturedAt`, `latitude`, `longitude`, `locationName`, `webUrl`, `embedding` (`vector`), `createdAt`
- **`Person`**: `id`, `name`, `email`, `avatarUrl`, `isSeeded`
- **`FaceDetection`**: `id`, `imageId`, `personId` (nullable for unknown), `boxX`, `boxY`, `boxWidth`, `boxHeight`, `confidence`
- **`ImageTag`**: `id`, `imageId`, `tag`, `confidence`
- **`SystemSetting`**: `key`, `value` (for global permission toggle, Hugging Face config)

---

## 8. Phased Implementation Roadmap

### Phase 1: Authentication, Tenant Access & Admin Core
- Set up NextAuth with Microsoft Entra ID SSO.
- Implement Owner role initialization via `OWNER_EMAIL`.
- Implement Azure App Registration integration with Microsoft Graph client.
- Build Admin Panel with folder URL input and SharePoint/OneDrive folder resolution.

### Phase 2: Ingestion Engine & Hugging Face Integration
- Implement Prisma schema with PostgreSQL and `pgvector`.
- Build Postgres-backed background queue and file traversal worker.
- Connect Hugging Face Gradio client with `HF_TOKEN` for face and tag extraction.
- Implement EXIF parser for GPS location and timestamps.
- Implement Server-Sent Events (SSE) for live admin progress tracking.

### Phase 3: Permissions, Delivery & User Search
- Implement Graph thumbnail rendering and direct file links.
- Implement Global & Per-Folder permission enforcement logic.
- Build User Panel with multi-modal search (people autocomplete, text queries, filters).
- Implement image modal with face tag overlays and metadata display.

### Phase 4: Owner Panel & Polish
- Build Owner dashboard for user role allocation and global settings toggle.
- Add folder re-scan / sync feature for delta updates.
- Performance tuning, error handling, and visual polish.
