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
import { revenueData } from "@/lib/mock-data";

interface RevenueChartProps {
  data?: Array<{ label: string; value: number }>;
  height?: number;
}

export function RevenueChart({ data = revenueData, height = 280 }: RevenueChartProps) {
  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickFormatter={(v) => (v === 0 ? "$0" : `$${v / 1000}K`)}
            domain={[0, 30000]}
            ticks={[0, 5000, 10000, 20000, 30000]}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "#13131c",
              border: "1px solid #2a2a38",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#fff",
            }}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#a855f7"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
            dot={{ r: 3, fill: "#a855f7", stroke: "#0a0a0f", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "#a855f7", stroke: "#0a0a0f", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
