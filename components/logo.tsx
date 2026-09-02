/**
 * Codebasics + PicScope lockup: the official mark and wordmark from
 * `public/logo.svg` (175×80 viewBox, brand blue #3B82F6), a hairline rule, then
 * the product name. Company blue stays on the logo; the product name is Grey 800
 * so blue keeps meaning "action" elsewhere in the UI.
 *
 * `wordmark={false}` renders the logo alone — use it where the product name is
 * already stated nearby.
 */
export function Logo({
  size = 24,
  wordmark = true,
  className = "",
}: {
  /** Rendered height of the logo in px; width follows the 2.19:1 aspect ratio. */
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt="Codebasics"
        width={Math.round(size * 2.1875)}
        height={size}
        style={{ height: size }}
        className="w-auto shrink-0"
      />
      {wordmark && (
        <>
          <span
            aria-hidden
            style={{ height: Math.round(size * 0.75) }}
            className="w-px shrink-0 bg-cb-border"
          />
          <span
            style={{ fontSize: Math.max(15, Math.round(size * 0.66)) }}
            className="font-extrabold tracking-[-0.02em] text-cb-text transition-colors duration-150 ease-out"
          >
            PicScope
          </span>
        </>
      )}
    </span>
  );
}
