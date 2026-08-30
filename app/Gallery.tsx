"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/spinner";

export type GalleryFace = {
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  name: string | null;
  confidence: number | null;
};

export type GalleryImage = {
  id: string;
  fileName: string;
  webUrl: string;
  width: number | null;
  height: number | null;
  capturedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  folderName: string;
  faces: GalleryFace[];
};

export default function Gallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState<GalleryImage | null>(null);

  if (images.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-cb-border p-10 text-center text-sm text-cb-text-muted">
        No photos yet. An admin needs to scan a folder and process the queue.
      </p>
    );
  }

  return (
    <>
      {/* Masonry via CSS columns — no JS layout needed. */}
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
        {images.map((img) => (
          <Thumb key={img.id} img={img} onOpen={() => setActive(img)} />
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl">
          {active && <Inspector image={active} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Thumb({ img, onOpen }: { img: GalleryImage; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  // Reserve the tile's height from known dimensions so the column doesn't jump when the image loads.
  const ratio = img.width && img.height ? img.width / img.height : undefined;

  return (
    <button
      onClick={onOpen}
      className="block w-full overflow-hidden rounded-lg border border-cb-border transition-colors duration-150 ease-out hover:border-cb-blue"
    >
      <div
        className="relative w-full bg-cb-surface"
        style={ratio ? { aspectRatio: String(ratio) } : undefined}
      >
        {!loaded && (
          <span className="absolute inset-0 flex items-center justify-center text-cb-text-muted">
            <Spinner className="h-5 w-5" />
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/images/${img.id}/thumb?size=medium`}
          alt={img.fileName}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`w-full transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      {img.faces.length > 0 && (
        <span className="block px-2 py-1.5 text-left text-xs font-medium text-cb-text-muted">
          {img.faces.filter((f) => f.name).length} known · {img.faces.length} face
          {img.faces.length === 1 ? "" : "s"}
        </span>
      )}
    </button>
  );
}

function Inspector({ image }: { image: GalleryImage }) {
  const [loaded, setLoaded] = useState(false);
  const canOverlay = !!image.width && !!image.height;
  const names = image.faces.map((f) => f.name).filter(Boolean) as string[];

  return (
    <div>
      <DialogTitle className="truncate text-lg font-semibold text-cb-text">
        {image.fileName}
      </DialogTitle>

      <div className="relative mt-3 flex min-h-[200px] items-center justify-center overflow-hidden rounded-lg border border-cb-border bg-cb-surface">
        {!loaded && (
          <span className="absolute inset-0 flex items-center justify-center text-cb-blue">
            <Spinner className="h-7 w-7" />
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/images/${image.id}/thumb?size=large`}
          alt={image.fileName}
          onLoad={() => setLoaded(true)}
          className={`mx-auto block max-h-[60vh] w-auto transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
        {canOverlay &&
          image.faces.map((f, i) => (
            <div
              key={i}
              className="absolute border-2 border-cb-blue"
              style={{
                left: `${(f.boxX / image.width!) * 100}%`,
                top: `${(f.boxY / image.height!) * 100}%`,
                width: `${(f.boxWidth / image.width!) * 100}%`,
                height: `${(f.boxHeight / image.height!) * 100}%`,
              }}
            >
              <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-cb-blue px-1.5 py-0.5 text-[10px] font-medium text-white">
                {f.name ?? "Unknown"}
              </span>
            </div>
          ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <Meta label="People">
          {names.length ? names.join(", ") : `${image.faces.length} unknown face(s)`}
        </Meta>
        <Meta label="Date taken">
          {image.capturedAt ? new Date(image.capturedAt).toLocaleString() : "—"}
        </Meta>
        <Meta label="Folder">{image.folderName}</Meta>
        <Meta label="Location">
          {image.latitude != null && image.longitude != null ? (
            <a
              href={`https://www.google.com/maps?q=${image.latitude},${image.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cb-blue hover:text-cb-blue-hover"
            >
              {image.latitude.toFixed(4)}, {image.longitude.toFixed(4)}
            </a>
          ) : (
            "—"
          )}
        </Meta>
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={image.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 items-center rounded-2xl bg-cb-blue px-5 text-sm font-bold text-white transition-colors duration-150 ease-out hover:bg-cb-blue-hover"
        >
          Open in SharePoint
        </a>
        <a
          href={`/api/images/${image.id}/download`}
          className="flex h-11 items-center rounded-2xl border border-cb-blue px-5 text-sm font-bold text-cb-blue transition-colors duration-150 ease-out hover:bg-cb-blue-subtle"
        >
          Download
        </a>
        <CopyLinkButton url={image.webUrl} />
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.04em] text-cb-text-muted">{label}</dt>
      <dd className="mt-0.5 text-cb-text">{children}</dd>
    </div>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex h-11 items-center rounded-2xl border border-cb-border px-5 text-sm font-bold text-cb-text transition-colors duration-150 ease-out hover:border-cb-border-hover"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
