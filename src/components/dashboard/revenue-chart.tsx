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

interface RevenueChartProps {
  data?: Array<{ date: string; revenue: string | number }>;
}

export function RevenueChart({ data = [] }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    revenue: Number(d.revenue),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-drift-muted">
        No revenue data yet
      </div>
    );
  }

  return (
    <div className="h-[200px] min-h-[200px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 2" stroke="#1e1e2e" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#111118",
              border: "1px solid #1e1e2e",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#fff",
            }}
            formatter={(value) => [`$${value}`, "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#7c3aed"
            strokeWidth={1.5}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{ r: 3, fill: "#7c3aed", stroke: "none" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
