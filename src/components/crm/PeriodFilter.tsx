import { useState } from "react";
import {
  PERIOD_LABELS,
  presetRange,
  todayBrt,
  addDays,
  type PeriodPreset,
} from "@/lib/period";

const PRESETS: PeriodPreset[] = ["day", "week", "month", "year", "custom"];

export function usePeriod(initial: Exclude<PeriodPreset, "custom"> = "day") {
  const [preset, setPreset] = useState<PeriodPreset>(initial);
  const base = presetRange(initial);
  const [customFrom, setCustomFrom] = useState(base.from);
  const [customTo, setCustomTo] = useState(base.to);
  const maxDay = addDays(todayBrt(), -1);

  const range =
    preset === "custom"
      ? { from: customFrom, to: customTo > maxDay ? maxDay : customTo }
      : presetRange(preset);

  const control = (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p}
          onClick={() => setPreset(p)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            preset === p
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
      {preset === "custom" ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={maxDay}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={customTo}
            max={maxDay}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
          />
        </div>
      ) : null}
    </div>
  );

  return { range, control };
}
