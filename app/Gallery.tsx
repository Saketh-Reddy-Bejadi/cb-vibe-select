"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  ExternalLink,
  ImageOff,
  Link2,
  ScanFace,
  Search,
} from "lucide-react";
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

/* -------------------------------------------------------------------------- */
/* Justified rows                                                             */
/* -------------------------------------------------------------------------- */

/** `index` is the image's position in the flat list, for lightbox navigation. */
type Tile = { img: GalleryImage; ratio: number; index: number };
type Row = { tiles: Tile[]; height: number };

type Layout = {
  /** Preferred row height. */
  target: number;
  gap: number;
  /** Hard cap on images per row — the knob that keeps phones legible. */
  maxPerRow: number;
  /** Ratios are clamped so one panorama can't flatten a row. Tighter on small
   *  screens, where a single tall portrait would otherwise fill the viewport. */
  minRatio: number;
  maxRatio: number;
};

/**
 * Row density scales with the container, so a photo occupies a comparable share
 * of the screen on every device. Without the cap a phone packs two images per
 * row and solves to ~119px tall — the same photos are 266px on desktop, and
 * faces stop being recognisable.
 */
function layoutFor(width: number): Layout {
  // Thresholds are CONTAINER width, not viewport — `max-w-6xl` plus gutters
  // caps this around 1088px, so anything above that never fires.
  if (width < 480) return { target: width, gap: 8, maxPerRow: 1, minRatio: 0.7, maxRatio: 1.9 };
  if (width < 700) return { target: 300, gap: 10, maxPerRow: 2, minRatio: 0.65, maxRatio: 2.1 };
  if (width < 1024) return { target: 280, gap: 12, maxPerRow: 3, minRatio: 0.55, maxRatio: 2.4 };
  return { target: 300, gap: 16, maxPerRow: 4, minRatio: 0.55, maxRatio: 2.4 };
}

/**
 * Flickr/Unsplash-style justified layout: fill each row to the exact container
 * width, then solve for the row height that makes it fit.
 *
 * CSS `columns` was the previous approach. It reads top-to-bottom per column,
 * so a date-sorted gallery came out visually scrambled, and it left ragged
 * column bottoms. This keeps left-to-right reading order and flush edges.
 */
function buildRows(images: GalleryImage[], width: number, cfg: Layout): Row[] {
  if (width <= 0) return [];
  const { target, gap, maxPerRow, minRatio, maxRatio } = cfg;
  const rows: Row[] = [];
  let cur: Tile[] = [];
  let ratioSum = 0;

  /** Height at which `n` tiles of total ratio `s` exactly span the container. */
  const solve = (n: number, s: number) => (width - gap * (n - 1)) / s;

  const close = () => {
    rows.push({ tiles: cur, height: solve(cur.length, ratioSum) });
    cur = [];
    ratioSum = 0;
  };

  images.forEach((img, index) => {
    const raw = img.width && img.height ? img.width / img.height : 1;
    const ratio = Math.min(Math.max(raw, minRatio), maxRatio);
    cur.push({ img, ratio, index });
    ratioSum += ratio;

    const full = cur.length >= maxPerRow;
    const overflows = ratioSum * target + gap * (cur.length - 1) >= width;
    if (!full && !overflows) return;

    // Breaking on overflow alone is crude: it takes whatever lands over the
    // edge, leaving rows far shorter than intended. Prefer whichever of "keep
    // this image" / "carry it to the next row" lands nearer the target — and
    // apply it when the row cap fired too, or hitting the cap would itself
    // force a squashed row.
    if (cur.length > 1) {
      const withIt = solve(cur.length, ratioSum);
      const withoutIt = solve(cur.length - 1, ratioSum - ratio);
      if (Math.abs(withoutIt - target) < Math.abs(withIt - target)) {
        const carried = cur.pop()!;
        ratioSum -= ratio;
        close();
        cur = [carried];
        ratioSum = carried.ratio;
        return;
      }
    }
    close();
  });

  // Trailing row: fill the width if it reached the row cap anyway (so the last
  // photo on a phone is not narrower than every photo above it), otherwise keep
  // the target height rather than stretching one photo across the viewport.
  if (cur.length) {
    const solved = solve(cur.length, ratioSum);
    rows.push({
      tiles: cur,
      height: cur.length >= maxPerRow ? solved : Math.min(target, solved),
    });
  }
  return rows;
}

// useLayoutEffect measures before paint; useEffect is the SSR-safe stand-in.
const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useContainerWidth<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [width, setWidth] = useState(0);
  useIsoLayout(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* -------------------------------------------------------------------------- */

const SRCSET_WIDTHS = [400, 800, 1200, 1600];
const src = (id: string, w: number) => `/api/images/${id}/thumb?w=${w}`;
const srcSet = (id: string) => SRCSET_WIDTHS.map((w) => `${src(id, w)} ${w}w`).join(", ");

export default function Gallery({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(ref);
  const cfg = useMemo(() => layoutFor(width), [width]);
  const rows = useMemo(() => buildRows(images, width, cfg), [images, width, cfg]);

  const go = useCallback(
    (delta: number) =>
      setActiveIndex((i) =>
        i === null ? i : Math.min(Math.max(i + delta, 0), images.length - 1)
      ),
    [images.length]
  );

  if (images.length === 0) {
    return (
      <div className="empty-state">
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-cb-text-subtle ring-1 ring-cb-border"
        >
          <Search className="h-5 w-5" />
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
      <div ref={ref} className="w-full">
        {rows.map((row, r) => (
          <div key={r} className="flex" style={{ gap: cfg.gap, marginBottom: cfg.gap }}>
            {row.tiles.map((tile) => (
              <Thumb
                key={tile.img.id}
                img={tile.img}
                width={tile.ratio * row.height}
                height={row.height}
                onOpen={() => setActiveIndex(tile.index)}
              />
            ))}
          </div>
        ))}
      </div>

      <Dialog
        open={activeIndex !== null}
        onOpenChange={(o) => !o && setActiveIndex(null)}
      >
        {/* Width follows the image (`w-fit`) instead of a fixed max, with a
            floor so the metadata grid stays readable behind a narrow portrait. */}
        <DialogContent className="max-h-[94dvh] w-fit min-w-[min(92vw,540px)] max-w-[96vw] overflow-y-auto rounded-[var(--r-sheet)] p-3 sm:p-5">
          {activeIndex !== null && (
            <Inspector
              image={images[activeIndex]}
              position={activeIndex + 1}
              total={images.length}
              onPrev={activeIndex > 0 ? () => go(-1) : undefined}
              onNext={activeIndex < images.length - 1 ? () => go(1) : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Thumb({
  img,
  width,
  height,
  onOpen,
}: {
  img: GalleryImage;
  width: number;
  height: number;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const named = img.faces.map((f) => f.name).filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${img.fileName}`}
      style={{ width, height }}
      className="group relative shrink-0 grow-0 overflow-hidden rounded-[var(--r-media)] bg-cb-surface text-left"
    >
      {!loaded && !errored && (
        <span className="absolute inset-0 flex items-center justify-center text-cb-text-subtle">
          <Spinner className="h-5 w-5" />
        </span>
      )}

      {errored ? (
        <span className="t-small absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center text-cb-text-muted">
          <ImageOff className="h-5 w-5" aria-hidden />
          Preview unavailable
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src(img.id, 800)}
          srcSet={srcSet(img.id)}
          // The layout gives us the exact rendered width, so the browser can
          // pick the right rendition instead of guessing from a breakpoint.
          sizes={`${Math.round(width)}px`}
          alt={img.fileName}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`h-full w-full object-cover transition-opacity duration-500 ease-out ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Scrim only on hover/focus. A gradient is a deliberate exception to the
          brand's no-gradient rule: text over arbitrary photography needs it to
          stay legible, and a flat overlay would dull the whole image. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-cb-navy/85 via-cb-navy/45 to-transparent p-3 pt-10 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="truncate text-[13px] font-bold leading-tight text-white">
          {img.fileName}
        </span>
        <span className="flex items-center gap-2 text-[11px] font-medium text-white/80">
          <span className="truncate">{img.folderName}</span>
          {img.faces.length > 0 && (
            <span className="flex shrink-0 items-center gap-1">
              <ScanFace className="h-3 w-3" />
              {named.length > 0 ? named.slice(0, 2).join(", ") : `${img.faces.length} face`}
              {named.length > 2 && ` +${named.length - 2}`}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */

function Inspector({
  image,
  position,
  total,
  onPrev,
  onNext,
}: {
  image: GalleryImage;
  position: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  // Tracking *which* image resolved, rather than a boolean, resets the state on
  // navigation for free — no effect, and the face toggle survives the move.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [erroredId, setErroredId] = useState<string | null>(null);
  // Off by default: boxes appear on hovering a face, or all at once via the toggle.
  const [showFaces, setShowFaces] = useState(false);
  const loaded = loadedId === image.id;
  const errored = erroredId === image.id;
  /** Something is actually on screen — gates the backdrop and every control. */
  const ready = loaded || errored;
  const canOverlay = !!image.width && !!image.height;
  const names = image.faces.map((f) => f.name).filter(Boolean) as string[];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPrev, onNext]);

  return (
    // Container queries, not viewport ones: the modal is now sized by the photo,
    // so a narrow portrait must lay its metadata out narrow even on a wide screen.
    <div className="@container flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 pr-10">
        <DialogTitle className="t-h4 truncate text-cb-text">{image.fileName}</DialogTitle>
        <span className="t-small shrink-0 tabular-nums text-cb-text-muted">
          {position} / {total}
        </span>
      </div>

      {/* `w-fit` makes this hug the image exactly, so there are no letterbox
          bars beside a portrait. Width/height attributes reserve the right box
          before the bytes arrive, so nothing reflows on load.

          The minimum has to live here rather than on the spinner: the spinner is
          absolutely positioned, and absolute children don't count towards
          `fit-content`, so a photo with no stored dimensions would collapse this
          box to zero and the spinner with it. Dropped once loaded so a small
          image still hugs. */}
      <div
        className={`relative mx-auto w-fit overflow-hidden rounded-[var(--r-card)] ${
          ready ? "bg-cb-navy" : ""
        }`}
        style={ready ? undefined : { minWidth: "min(320px, 72vw)", minHeight: 240 }}
      >
        {/* While loading there is no backdrop and no controls — just the spinner,
            so nothing frames an image that isn't there yet. The reserved box stays
            (transparent) so the modal doesn't jump when the photo arrives. */}
        {!loaded && !errored && (
          <span className="absolute inset-0 flex items-center justify-center text-cb-text-subtle">
            <Spinner className="h-7 w-7" />
          </span>
        )}
        {errored ? (
          <p className="t-small max-w-xs px-6 py-16 text-center text-white/70">
            Preview unavailable — open the file in SharePoint instead.
          </p>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={image.id}
            src={src(image.id, 1600)}
            srcSet={`${src(image.id, 1200)} 1200w, ${src(image.id, 1600)} 1600w, ${src(
              image.id,
              2400
            )} 2400w`}
            sizes="(min-width: 1024px) 70vw, 92vw"
            width={image.width ?? undefined}
            height={image.height ?? undefined}
            alt={image.fileName}
            onLoad={() => setLoadedId(image.id)}
            onError={() => setErroredId(image.id)}
            className={`block h-auto max-h-[72dvh] w-auto max-w-[min(88vw,1000px)] transition-opacity duration-300 ease-out ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* One transparent hit area per face. Nothing is drawn until you point
            at a face — or until the toggle forces them all on, which is the
            only route available on touch and by keyboard. */}
        {canOverlay &&
          loaded &&
          !errored &&
          image.faces.map((f, i) => (
            <div
              key={i}
              className="group/face absolute"
              style={{
                left: `${(f.boxX / image.width!) * 100}%`,
                top: `${(f.boxY / image.height!) * 100}%`,
                width: `${(f.boxWidth / image.width!) * 100}%`,
                height: `${(f.boxHeight / image.height!) * 100}%`,
              }}
            >
              <span
                aria-hidden
                className={`absolute inset-0 rounded-[4px] border-2 border-cb-blue transition-opacity duration-150 ease-out ${
                  showFaces ? "opacity-100" : "opacity-0 group-hover/face:opacity-100"
                }`}
              />
              <span
                className={`absolute -top-[22px] left-0 whitespace-nowrap rounded-md bg-cb-blue px-1.5 py-0.5 text-[11px] font-bold text-white transition-opacity duration-150 ease-out ${
                  showFaces ? "opacity-100" : "opacity-0 group-hover/face:opacity-100"
                }`}
              >
                {f.name ?? "Unknown"}
              </span>
            </div>
          ))}

        {ready && onPrev && <NavButton side="left" onClick={onPrev} />}
        {ready && onNext && <NavButton side="right" onClick={onNext} />}

        {ready && image.faces.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFaces((v) => !v)}
            aria-pressed={showFaces}
            className="absolute right-3 top-3 flex h-9 items-center gap-1.5 rounded-full bg-cb-navy/70 px-3 text-[13px] font-bold text-white backdrop-blur-sm transition-colors duration-150 ease-out hover:bg-cb-navy/90"
          >
            <ScanFace className="h-4 w-4" aria-hidden />
            {showFaces ? "Hide faces" : "Show faces"}
          </button>
        )}
      </div>

      {/* Each field drops out entirely when it has no value — most photos carry
          no GPS, and a column of "—" is noise rather than information. */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 empty:hidden @3xl:grid-cols-4">
        <Meta label="People">
          {names.length
            ? names.join(", ")
            : image.faces.length
              ? `${image.faces.length} unidentified`
              : null}
        </Meta>
        <Meta label="Date taken">
          {image.capturedAt ? new Date(image.capturedAt).toLocaleString() : null}
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
          ) : null}
        </Meta>
      </dl>

      <div className="flex flex-col gap-2 border-t border-cb-border pt-4 @lg:flex-row @lg:flex-wrap @lg:gap-3">
        <a
          href={image.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-block @lg:w-auto"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Open in SharePoint
        </a>
        <a
          href={`/api/images/${image.id}/download`}
          className="btn btn-secondary btn-block @lg:w-auto"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download
        </a>
        <CopyLinkButton url={image.webUrl} />
      </div>
    </div>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cb-navy/60 text-white backdrop-blur-sm transition-colors duration-150 ease-out hover:bg-cb-navy/90 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

/** Renders nothing at all — label included — when there is no value to show. */
function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === false || children === "") return null;
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
      className="btn btn-neutral btn-block @lg:w-auto"
    >
      {copied ? (
        <Check className="h-4 w-4 text-cb-blue" aria-hidden />
      ) : (
        <Link2 className="h-4 w-4" aria-hidden />
      )}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}
