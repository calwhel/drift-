"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { paymentMethodsData } from "@/lib/mock-data";
import { CHART_COLORS } from "@/lib/constants";

const FALLBACK_COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#7c3aed", "#14b8a6"];

interface PaymentMethodsChartProps {
  data?: Record<string, number>;
  total?: number;
  centerValue?: string;
}

export function PaymentMethodsChart({ data, total, centerValue }: PaymentMethodsChartProps) {
  const entries = data ? Object.entries(data) : [];
  const sum = entries.reduce((s, [, v]) => s + v, 0);

  const chartData =
    entries.length > 0
      ? entries.map(([name, value], i) => ({
          name,
          value: Math.round((value / (sum || 1)) * 1000) / 10,
          color: CHART_COLORS[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        }))
      : paymentMethodsData;

  const displayTotal =
    centerValue ??
    (total != null
      ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
      : "$24,560");

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-base font-bold tabular-nums text-white">{displayTotal}</p>
          <p className="text-[11px] text-drift-muted">Total</p>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-drift-muted">{item.name}</span>
            </div>
            <span className="font-medium tabular-nums text-white">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
