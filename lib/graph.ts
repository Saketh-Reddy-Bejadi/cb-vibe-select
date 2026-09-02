// App-only Microsoft Graph client (client-credentials flow) per PRD §4.1.
// ponytail: plain fetch + in-memory token cache — no @azure/identity / graph SDK for two calls.

const TENANT = process.env.AZURE_TENANT_ID!;
const CLIENT_ID = process.env.AZURE_CLIENT_ID!;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;

let cached: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Graph token request failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh 60s early to avoid edge-of-expiry failures.
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cached.token;
}

async function graphFetch<T>(url: string): Promise<T> {
  const token = await getAppToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Graph GET ${url} failed (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export function graphGet<T>(path: string): Promise<T> {
  return graphFetch<T>(`https://graph.microsoft.com/v1.0${path}`);
}

// Fetch raw image bytes into memory ONLY — never written to disk/blob. The caller streams these
// straight through the face pipeline + EXIF and discards them; we persist only metadata + graphItemId.
// /content 302s to a pre-authed storage URL; fetch follows it (undici drops Authorization on the
// cross-origin redirect, which is correct — the redirect URL is already pre-authed).
export async function fetchImageBytes(driveId: string, itemId: string): Promise<Buffer> {
  const token = await getAppToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Graph fetch bytes ${itemId} failed (${res.status}): ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// Fetch a Graph-generated thumbnail (CDN-cached, small). size: "small" | "medium" | "large".
// Bytes are proxied to the browser, never stored. Returns null if no thumbnail exists.
/**
 * `size` is either a named Graph rendition (small=96px, medium=176px,
 * large=800px on the longest edge) or a custom bounding box like "1200x1200",
 * which scales to fit without cropping.
 *
 * The named sizes are far too small for a retina gallery tile, so callers ask
 * for a custom box. Custom renditions aren't available on every drive, so a
 * failed custom request falls back to `large` rather than failing outright.
 */
export async function fetchThumbnail(
  driveId: string,
  itemId: string,
  size: string = "large",
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const token = await getAppToken();
  const get = (s: string) =>
    fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/thumbnails/0/${s}/content`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

  let res = await get(size);
  if (!res.ok && /^\d+x\d+$/.test(size)) res = await get("large");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Graph thumbnail ${itemId} failed (${res.status})`);
  return {
    body: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") ?? "image/jpeg",
  };
}

const SUPPORTED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/tiff",
]);

type DriveItem = {
  id: string;
  name: string;
  size?: number;
  webUrl: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
  image?: { width?: number; height?: number };
};

type ChildrenPage = { value: DriveItem[]; "@odata.nextLink"?: string };

export type DiscoveredImage = {
  graphItemId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  webUrl: string;
  width: number | null;
  height: number | null;
};

const SELECT = "$select=id,name,size,webUrl,file,folder,image&$top=200";

// Recursively list supported image files under a folder. BFS across subfolders when recursive.
export async function listImages(
  driveId: string,
  itemId: string,
  recursive: boolean,
): Promise<DiscoveredImage[]> {
  const images: DiscoveredImage[] = [];
  const toVisit = [itemId];

  while (toVisit.length) {
    const current = toVisit.shift()!;
    let url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${current}/children?${SELECT}`;
    while (url) {
      const page = await graphFetch<ChildrenPage>(url);
      for (const item of page.value) {
        if (item.folder) {
          if (recursive) toVisit.push(item.id);
        } else if (item.file && SUPPORTED_IMAGE_MIME.has(item.file.mimeType)) {
          images.push({
            graphItemId: item.id,
            fileName: item.name,
            mimeType: item.file.mimeType,
            sizeBytes: item.size ?? null,
            webUrl: item.webUrl,
            width: item.image?.width ?? null,
            height: item.image?.height ?? null,
          });
        }
      }
      url = page["@odata.nextLink"] ?? "";
    }
  }

  return images;
}

export type ResolvedFolder = {
  id: string;
  name: string;
  webUrl: string;
  parentReference?: { driveId?: string };
  folder?: { childCount: number };
};

// Encode any SharePoint/OneDrive web or sharing URL into a Graph share id.
// https://learn.microsoft.com/graph/api/shares-get -> "u!" + base64url(url)
function encodeShareUrl(url: string): string {
  const b64 = Buffer.from(url, "utf-8").toString("base64");
  return "u!" + b64.replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
}

// Resolve a pasted folder URL to a Graph driveItem (works for SharePoint & OneDrive).
export async function resolveFolder(url: string): Promise<ResolvedFolder> {
  const shareId = encodeShareUrl(url.trim());
  const item = await graphGet<ResolvedFolder>(`/shares/${shareId}/driveItem`);
  if (!item.folder) {
    throw new Error("That link points to a file, not a folder. Paste a folder link.");
  }
  return item;
}
