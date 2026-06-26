"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyStat } from "@/lib/data";

const SUCCESS = "#22c55e";
const FAILED = "#ef4444";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="mb-1.5 font-mono text-xs text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="capitalize text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data }: { data: DailyStat[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(99,102,241,0.12)"
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{
              fill: "#8b8b96",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{
              fill: "#8b8b96",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            width={40}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "rgba(99,102,241,0.3)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="success"
            stackId="1"
            stroke={SUCCESS}
            strokeWidth={2}
            fill={SUCCESS}
            fillOpacity={0.14}
          />
          <Area
            type="monotone"
            dataKey="failed"
            stackId="1"
            stroke={FAILED}
            strokeWidth={2}
            fill={FAILED}
            fillOpacity={0.16}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
