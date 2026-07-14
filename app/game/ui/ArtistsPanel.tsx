import { Hammer, Paintbrush, Palette, type LucideIcon } from "lucide-react";

import { useGameStore } from "~/stores/useGameStore";
import { nextRankXp, RANK_LABEL } from "~/game/artists";
import { BUILDING_METADATA_BY_ID } from "~/game/buildings";
import {
  blockedReason,
  commissionMaterial,
  getSupply,
  MATERIAL_BY_ARTIST_TYPE,
} from "~/game/materials";
import { HudPanel } from "./Panel";
import { capitalizeLabel } from "./format";

const ARTIST_ICONS: Record<string, LucideIcon> = {
  painter: Palette,
  sculptor: Hammer,
};

function ArtistThumb({ type }: { type?: string }) {
  const Icon = (type && ARTIST_ICONS[type]) || Paintbrush;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-wood/50 bg-parchment-deep">
      <Icon className="h-5 w-5 text-ink-faint" strokeWidth={1.75} />
    </div>
  );
}

export function ArtistsPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const artists = useGameStore((s) => s.artists);
  const tiles = useGameStore((s) => s.map.tiles);
  const commissions = useGameStore((s) => s.commissions);

  const workshops = Object.values(tiles)
    .filter((t) => t.isOrigin && BUILDING_METADATA_BY_ID[t.buildingId]?.artistCapacity != null)
    .map((t) => `${t.position.x},${t.position.y}`)
    .sort();
  const supply = getSupply(tiles, artists, commissions);

  return (
    <HudPanel
      icon={Paintbrush}
      open={open}
      onToggle={onToggle}
      label="Artists & Workshops"
      header={
        <span className="flex items-center gap-1.5">
          Artists &amp; Workshops{workshops.length > 0 && ` (${workshops.length})`}
        </span>
      }
      className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto"
    >
        {workshops.length === 0 && (
          <span className="text-sm text-ink-faint">
            No workshops yet — build a Painter's or Sculptor's Workshop and artists will arrive.
          </span>
        )}
        {workshops.map((key) => {
          const members = artists.filter((a) => a.homeTileKey === key);
          const founder = members[0];
          const active = tiles[key]?.isActive ?? false;
          if (!founder) {
            // Pre-rework save: workshop without a crew; first arrival founds it.
            return (
              <div key={key} className="flex items-center gap-2.5">
                <ArtistThumb />
                <div className="flex flex-col leading-tight">
                  <span className="font-display text-base font-semibold text-ink">Workshop</span>
                  <span className="text-xs text-ink-faint">Vacant</span>
                </div>
              </div>
            );
          }
          const commission = commissions.find((c) => c.workshopKey === key);
          const working = founder.workProgress != null && commission != null;
          // Working founders gate on their commission's material; an idle founder
          // shows the type-default material's capacity as a hint.
          // ponytail: an idle sculptor reads marble even if only bronze is short —
          // the exact material is only pinned when a specific offer is assigned.
          const material = commission
            ? commissionMaterial(commission)
            : MATERIAL_BY_ARTIST_TYPE[founder.type];
          const founderSupply = material ? supply[material] : undefined;
          const xpCeiling = nextRankXp(founder.rank);
          const xpLabel = `${Math.floor(founder.xp ?? 0).toLocaleString()}${
            xpCeiling != null ? ` / ${xpCeiling.toLocaleString()}` : ""
          } XP`;
          const materialBlocked = working && founderSupply != null && !founderSupply.allowed.has(key);
          const atCapacity = founderSupply != null && founderSupply.inUse >= founderSupply.capacity;
          return (
            <div key={key} className="flex items-start gap-2.5">
              <ArtistThumb type={founder.type} />
              <div className="flex flex-col leading-tight">
                <span className="font-display text-base font-semibold text-ink">
                  Bottega di {founder.name}
                </span>
                <span className="text-sm text-ink-faint">
                  {RANK_LABEL[founder.rank]} {capitalizeLabel(founder.type)} · {xpLabel} ·{" "}
                  {members.length} {members.length === 1 ? "artist" : "artists"}
                </span>
                {working ? (
                  <span className={`text-xs ${active ? "text-prestige-gold" : "text-sienna"}`}>
                    At work on {commission!.title} — {Math.floor(founder.workProgress!)}/
                    {commission!.durationMonths} months
                    {materialBlocked
                      ? ` (no ${material})`
                      : !active && " (paused)"}
                  </span>
                ) : !active ? (
                  <span className="text-xs text-sienna">Workshop unstaffed</span>
                ) : atCapacity ? (
                  <span className="text-xs text-sienna">
                    {blockedReason(material, founderSupply)}
                  </span>
                ) : (
                  <span className="text-xs text-ink-faint">Awaiting a commission</span>
                )}
              </div>
            </div>
          );
        })}
    </HudPanel>
  );
}
