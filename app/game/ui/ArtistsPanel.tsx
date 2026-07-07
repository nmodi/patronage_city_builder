import { useGameStore } from "~/stores/useGameStore";
import { Panel } from "./Panel";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ArtistsPanel() {
  const artists = useGameStore((s) => s.artists);
  const tiles = useGameStore((s) => s.map.tiles);

  if (artists.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-40 w-56">
      <Panel header={`Artists (${artists.length})`} className="flex flex-col gap-2">
        {artists.map((artist) => {
          const active = tiles[artist.homeTileKey]?.isActive ?? false;
          return (
            <div key={artist.id} className="flex flex-col leading-tight">
              <span className="font-display text-sm font-semibold text-stone-800">{artist.name}</span>
              <span className="text-xs text-stone-500">
                {capitalize(artist.rank)} {capitalize(artist.type)}
              </span>
              <span className={`text-[10px] ${active ? "text-emerald-700" : "text-amber-700"}`}>
                {active ? "At the atelier" : "Atelier unstaffed"}
              </span>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}
