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

export async function graphGet<T>(path: string): Promise<T> {
  const token = await getAppToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Graph GET ${path} failed (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
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
