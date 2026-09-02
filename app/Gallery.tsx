"use client";

import { useState } from "react";
import { ExternalLink, Download, Link2, Check, Users } from "lucide-react";
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
      <div className="empty-state">
        <span
          aria-hidden
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-cb-text-subtle ring-1 ring-cb-border"
        >
          <Users className="h-5 w-5" />
        </span>
        <p className="t-h4 text-cb-text">No photos to show</p>
        <p className="t-small max-w-sm text-cb-text-muted">
          Nothing matches the current filters. Clear them, or ask an admin to scan a folder and
          process the queue.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Masonry via CSS columns — no JS layout needed. One column on the
          narrowest phones so tiles never fall below a usable size. */}
      <div className="columns-1 gap-3 min-[420px]:columns-2 sm:columns-3 sm:gap-4 lg:columns-4 2xl:columns-5 [&>*]:mb-3 sm:[&>*]:mb-4">
        {images.map((img) => (
          <Thumb key={img.id} img={img} onOpen={() => setActive(img)} />
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-[var(--r-sheet)] p-4 sm:max-w-3xl sm:p-6">
          {active && <Inspector image={active} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Thumb({ img, onOpen }: { img: GalleryImage; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  // Reserve the tile's height from known dimensions so the column doesn't jump when the image loads.
  const ratio = img.width && img.height ? img.width / img.height : undefined;
  const known = img.faces.filter((f) => f.name).length;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${img.fileName}`}
      className="card card-interactive group block w-full overflow-hidden text-left hover:border-cb-blue hover:outline-cb-blue"
    >
      <div
        className="relative w-full overflow-hidden rounded-t-[calc(var(--r-card)-1px)] bg-cb-surface"
        style={ratio ? { aspectRatio: String(ratio) } : { aspectRatio: "1" }}
      >
        {!loaded && !errored && (
          <span className="absolute inset-0 flex items-center justify-center text-cb-text-subtle">
            <Spinner className="h-5 w-5" />
          </span>
        )}
        {errored ? (
          <span className="t-small absolute inset-0 flex items-center justify-center px-3 text-center text-cb-text-muted">
            Preview unavailable
          </span>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/images/${img.id}/thumb?size=medium`}
            alt={img.fileName}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`block w-full transition-opacity duration-300 ease-out ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="t-small min-w-0 flex-1 truncate font-medium text-cb-text">
          {img.fileName}
        </span>
        {img.faces.length > 0 && (
          <span
            className="chip chip-neutral shrink-0 !min-h-6 !px-2 !text-[11px]"
            title={`${known} identified of ${img.faces.length} face(s)`}
          >
            {known}/{img.faces.length}
          </span>
        )}
      </div>
    </button>
  );
}

function Inspector({ image }: { image: GalleryImage }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const canOverlay = !!image.width && !!image.height;
  const names = image.faces.map((f) => f.name).filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4">
      <DialogTitle className="t-h3 truncate pr-10 text-cb-text">{image.fileName}</DialogTitle>

      <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-[var(--r-card)] border border-cb-border bg-cb-surface">
        {!loaded && !errored && (
          <span className="absolute inset-0 flex items-center justify-center text-cb-blue">
            <Spinner className="h-7 w-7" />
          </span>
        )}
        {errored && (
          <p className="t-small max-w-xs px-6 py-12 text-center text-cb-text-muted">
            Preview unavailable — open the file in SharePoint instead.
          </p>
        )}
        {/* The overlay is positioned against this wrapper, which is sized by the image. */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/images/${image.id}/thumb?size=large`}
            alt={image.fileName}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`mx-auto block max-h-[55dvh] w-auto transition-opacity duration-300 ease-out ${
              loaded && !errored ? "opacity-100" : "opacity-0"
            }`}
          />
          {canOverlay &&
            loaded &&
            !errored &&
            image.faces.map((f, i) => (
              <div
                key={i}
                className="animate-rise absolute rounded-[3px] border-2 border-cb-blue"
                style={{
                  left: `${(f.boxX / image.width!) * 100}%`,
                  top: `${(f.boxY / image.height!) * 100}%`,
                  width: `${(f.boxWidth / image.width!) * 100}%`,
                  height: `${(f.boxHeight / image.height!) * 100}%`,
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <span className="absolute -top-[22px] left-0 whitespace-nowrap rounded-md bg-cb-blue px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {f.name ?? "Unknown"}
                </span>
              </div>
            ))}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <Meta label="People">
          {names.length
            ? names.join(", ")
            : image.faces.length
              ? `${image.faces.length} unidentified face(s)`
              : "None detected"}
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
              className="rounded text-cb-blue underline-offset-4 transition-colors duration-150 ease-out hover:text-cb-blue-hover hover:underline"
            >
              {image.latitude.toFixed(4)}, {image.longitude.toFixed(4)}
            </a>
          ) : (
            "—"
          )}
        </Meta>
      </dl>

      {/* Full-width stacked on phones so every action keeps a comfortable target. */}
      <div className="flex flex-col gap-2 border-t border-cb-border pt-4 sm:flex-row sm:flex-wrap sm:gap-3">
        <a
          href={image.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-block sm:w-auto"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Open in SharePoint
        </a>
        <a
          href={`/api/images/${image.id}/download`}
          className="btn btn-secondary btn-block sm:w-auto"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download
        </a>
        <CopyLinkButton url={image.webUrl} />
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="t-label text-cb-text-muted">{label}</dt>
      <dd className="t-small mt-1 break-words font-medium text-cb-text">{children}</dd>
    </div>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn btn-neutral btn-block sm:w-auto"
    >
      {copied ? (
        <Check className="h-4 w-4 text-cb-blue" aria-hidden />
      ) : (
        <Link2 className="h-4 w-4" aria-hidden />
      )}
      {/* aria-live so the confirmation reaches screen readers too. */}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}
