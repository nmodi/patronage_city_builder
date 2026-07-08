import { useEffect } from "react";
import type { MetaFunction } from "react-router";

import { BabylonCanvas } from "~/game/render/BabylonCanvas";
import { GameHUD } from "~/game/ui/GameHUD";
import { useGameShortcuts } from "~/game/ui/useGameShortcuts";
import { useGameLoop } from "~/game/ui/useGameLoop";
import { seedDemoCity } from "~/game/demoCity";
import { useGameStore } from "~/stores/useGameStore";

export const meta: MetaFunction = () => {
  return [
    { title: "Patronage" },
    { name: "description", content: "Renaissance Era City Builder" },
  ];
};

export default function GameWindow() {
  useGameLoop();
  useGameShortcuts();

  useEffect(() => {
    const demo = window.location.search.includes("demo");
    if (!demo) useGameStore.persist.rehydrate();
    if (!import.meta.env.DEV) return;
    if (demo) seedDemoCity();
    if (window.location.search.includes("pause")) useGameStore.getState().setPaused(true);
  }, []);

  return (
    <div className="w-full h-screen relative">
      <BabylonCanvas />
      <GameHUD />
    </div>
  );
}
