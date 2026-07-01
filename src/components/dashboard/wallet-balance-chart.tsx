"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { walletChartData } from "@/lib/mock-data";

export interface BalanceChartPoint {
  day: string;
  balance: number;
}

export function WalletBalanceChart({
  height = 150,
  data,
}: {
  height?: number;
  data?: BalanceChartPoint[];
}) {
  const chartData: BalanceChartPoint[] =
    data && data.length > 0
      ? data.map((d) => ({ day: d.day, balance: d.balance }))
      : walletChartData;
  const maxBalance = Math.max(...chartData.map((d) => d.balance), 1);

  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="walletGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, maxBalance * 1.1]} />
          <Tooltip
            contentStyle={{
              background: "#13131c",
              border: "1px solid #2a2a38",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#fff",
            }}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, "Balance"]}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#a855f7"
            strokeWidth={2.5}
            fill="url(#walletGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
