import { Minus, Plus } from "lucide-react";
import { type ReactNode } from "react";

interface MapViewportProps {
  imageUrl: string;
  zoom: number;
  onZoomChange: (next: number) => void;
  onWheel?: (delta: number) => void;
  cursor?: string;
  imageOpacity?: number;
  overlayOpacity?: number;
  children?: ReactNode;
  footer?: ReactNode;
}

export function MapViewport({
  imageUrl,
  zoom,
  onZoomChange,
  onWheel,
  cursor = "default",
  imageOpacity = 1,
  overlayOpacity = 0.35,
  children,
  footer,
}: MapViewportProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-map)]">
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onWheel={(event) => {
          event.preventDefault();
          onWheel?.(event.deltaY);
        }}
        style={{ cursor }}
      >
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(zoom + 0.15, 2.5))}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(zoom - 0.15, 0.75))}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute inset-0" style={{ background: `rgba(0, 0, 0, ${overlayOpacity})` }} />
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <div
            className="relative aspect-square h-full max-w-full origin-center transition-transform duration-150"
            style={{ transform: `scale(${zoom})` }}
          >
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full select-none object-contain transition duration-200"
              style={{ opacity: imageOpacity }}
              draggable={false}
            />
            <div className="absolute inset-0">{children}</div>
          </div>
        </div>
      </div>
      {footer ? <div className="border-t border-[var(--bg-tertiary)]">{footer}</div> : null}
    </div>
  );
}
