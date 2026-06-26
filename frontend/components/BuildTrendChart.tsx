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
import type { DailyPoint } from "@/lib/mock-data";

const SUCCESS = "#22C55E";
const DANGER = "#EF4444";

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-xl">
      <p className="mb-1.5 font-mono text-xs text-text-muted">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="capitalize text-text-muted">{item.name}</span>
          <span className="ml-auto font-mono font-semibold text-text-primary">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BuildTrendChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Build Outcomes
          </h2>
          <p className="text-xs text-text-muted">Last 14 days</p>
        </div>
        <div className="flex items-center gap-4">
          <Legend color={SUCCESS} label="Success" />
          <Legend color={DANGER} label="Failure" />
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2A2A3A"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748B", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#2A2A3A" }}
            />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#2A2A3A" }} />
            <Area
              type="monotone"
              dataKey="success"
              stackId="1"
              stroke={SUCCESS}
              strokeWidth={2}
              fill="url(#fillSuccess)"
            />
            <Area
              type="monotone"
              dataKey="failure"
              stackId="1"
              stroke={DANGER}
              strokeWidth={2}
              fill="url(#fillFailure)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
