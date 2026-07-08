import { useState } from "react";
import { Coins, Crown, Pause, Play, RotateCcw, Settings, Sparkles, Users } from "lucide-react";

import { useGameStore } from "~/stores/useGameStore";
import { BASE_TICK_INTERVAL, GAME_SPEED_MULTIPLIERS } from "~/game/constants";
import { GalleryPanel } from "./GalleryPanel";
import { Panel } from "./Panel";
import { ResourceStat } from "./ResourceStat";

export function TopBar() {
  const florins = useGameStore((s) => s.florins);
  const inspiration = useGameStore((s) => s.inspiration);
  const prestige = useGameStore((s) => s.prestige);
  const addFlorins = useGameStore((s) => s.addFlorins);
  const calendarLabel = useGameStore((s) => s.getCalendarLabel());
  const paused = useGameStore((s) => s.paused);
  const togglePause = useGameStore((s) => s.togglePause);
  const tickInterval = useGameStore((s) => s.tickInterval);
  const setTickInterval = useGameStore((s) => s.setTickInterval);
  const population = useGameStore((s) => s.population);
  const housing = useGameStore((s) => s.getHousing());
  const resetGame = useGameStore((s) => s.resetGame);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed top-4 left-4 right-4 z-50 flex items-start justify-between gap-4">
      <Panel className="flex items-center gap-4">
        {/* Fixed width so variable-width month names don't resize the card. */}
        <div className="flex w-24 flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wide text-ink-faint">Date</span>
          <span className="whitespace-nowrap font-display text-lg font-semibold text-ink">
            {calendarLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 border-l border-wood/50 pl-3">
          <button
            className="rounded-full bg-ink p-2 text-parchment transition hover:bg-ink/80"
            onClick={togglePause}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          {GAME_SPEED_MULTIPLIERS.map((multiplier) => {
            const interval = BASE_TICK_INTERVAL / multiplier;
            const isActive = tickInterval === interval;
            return (
              <button
                key={multiplier}
                className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                  isActive ? "bg-sienna text-parchment" : "bg-parchment-deep text-ink-faint hover:text-ink"
                }`}
                onClick={() => setTickInterval(BASE_TICK_INTERVAL / multiplier)}
              >
                {multiplier}x
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel className="flex items-center gap-6">
        <ResourceStat icon={Coins} label="Florins" value={`${florins}ƒ`} iconClassName="text-prestige-gold" />
        <ResourceStat icon={Users} label="Population" value={`${population}/${housing}`} iconClassName="text-sienna" />
        <ResourceStat icon={Sparkles} label="Inspiration" value={inspiration} iconClassName="text-prestige-gold" />
        <ResourceStat icon={Crown} label="Prestige" value={prestige} iconClassName="text-sienna" />
      </Panel>

      <div className="relative flex flex-col items-end gap-2">
        <Panel className="flex items-center gap-2 text-xs text-ink-faint">
          <span>v0.1</span>
          <button
            className="rounded-full px-2 py-1 font-semibold text-ink-faint transition hover:text-ink"
            onClick={() => addFlorins(100)}
          >
            +100ƒ
          </button>
          <GalleryPanel />
          <button
            className="rounded-full bg-parchment-deep p-2 text-ink transition hover:bg-wood/40"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </Panel>
        {settingsOpen && (
          <Panel header="Settings" className="flex w-48 flex-col gap-2 text-sm">
            <button
              className="flex items-center gap-2 rounded-lg bg-sienna px-3 py-2 font-semibold text-parchment transition hover:bg-sienna/85"
              onClick={() => {
                if (window.confirm("Restart the game? All progress will be lost.")) {
                  resetGame();
                  setSettingsOpen(false);
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Restart Game
            </button>
          </Panel>
        )}
      </div>
    </div>
  );
}
