"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS } from "@/lib/constants";

interface PaymentMethodsChartProps {
  data?: Record<string, number>;
  total?: number;
}

const FALLBACK_COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#7c3aed", "#14b8a6"];

export function PaymentMethodsChart({ data = {}, total = 0 }: PaymentMethodsChartProps) {
  const entries = Object.entries(data);
  const sum = entries.reduce((s, [, v]) => s + v, 0) || 1;

  const chartData = entries.map(([name, value], i) => ({
    name,
    value: Math.round((value / sum) * 1000) / 10,
    color: CHART_COLORS[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[160px] items-center justify-center text-xs text-drift-muted">
        No payment data yet
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-[160px] min-h-[160px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#111118",
                border: "1px solid #1e1e2e",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#fff",
              }}
              formatter={(value) => [`${value}%`, "Share"]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-sm font-semibold tabular-nums text-white">
            ${total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </p>
          <p className="text-2xs text-drift-muted">Total</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 border-t border-drift-border pt-3">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-2xs">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-drift-muted">{item.name}</span>
            </div>
            <span className="tabular-nums text-white">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
