import type { ReactNode } from "react";

interface PanelProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ header, children, className = "" }: PanelProps) {
  return (
    <div
      data-hud="true"
      className="panel-parchment pointer-events-auto rounded-lg text-ink"
    >
      {header && (
        <div className="mx-2 border-b border-wood/50 px-2 py-2 font-display text-sm font-semibold tracking-wider text-ink [font-variant-caps:small-caps]">
          {header}
        </div>
      )}
      <div className={`px-4 py-3 ${className}`}>{children}</div>
    </div>
  );
}
