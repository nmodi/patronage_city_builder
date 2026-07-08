import { useState } from "react";
import { createPortal } from "react-dom";
import { Images, X } from "lucide-react";

import { formatMonth, useGameStore } from "~/stores/useGameStore";
import { RANK_LABEL } from "~/game/artists";
import { Panel } from "./Panel";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Icon button (lives in the TopBar) + fullscreen codex modal.
export function GalleryPanel() {
  const [open, setOpen] = useState(false);
  const artworks = useGameStore((s) => s.artworks);
  const artists = useGameStore((s) => s.artists);

  return (
    <>
      <button
        className="rounded-full bg-parchment-deep p-2 text-ink transition hover:bg-wood/40"
        onClick={() => setOpen(true)}
        aria-label="Gallery"
        title="Gallery"
      >
        <Images className="h-4 w-4" />
      </button>
      {/* Portal: keeps the fixed modal out of the TopBar panel's stacking
          context so it can't get pinned to the panel. */}
      {open && createPortal(
        <div
          data-hud="true"
          className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div className="w-[28rem]" onClick={(e) => e.stopPropagation()}>
            <Panel
              header={
                <div className="flex items-center justify-between">
                  <span>Gallery of Works ({artworks.length})</span>
                  <button
                    className="rounded-full p-1 text-ink-faint transition hover:bg-parchment-deep"
                    onClick={() => setOpen(false)}
                    aria-label="Close gallery"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              }
              className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto"
            >
              {artworks.length === 0 ? (
                <span className="text-sm text-ink-faint">
                  No works completed yet — accept a commission to begin.
                </span>
              ) : (
                [...artworks].reverse().map((w) => {
                  const artist = artists.find((a) => a.id === w.artistId);
                  return (
                    <div key={w.id} className="flex items-center gap-3">
                      <img
                        src="/art-placeholder.svg"
                        alt={w.name}
                        className="h-16 w-12 shrink-0 rounded-sm border border-wood/50 shadow-md shadow-black/30"
                      />
                      <div className="flex flex-col leading-tight">
                        <span className="font-display text-sm font-semibold text-ink">
                          {w.name}
                        </span>
                        <span className="text-xs text-ink-faint">
                          {artist
                            ? `${artist.name}, ${RANK_LABEL[artist.rank]} ${capitalize(w.artistType)}`
                            : capitalize(w.artistType)}
                        </span>
                        <span className="text-[10px] text-ink-faint">
                          {w.requester ? `For ${w.requester} · ` : ""}
                          Completed {formatMonth(w.completedTick)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </Panel>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
