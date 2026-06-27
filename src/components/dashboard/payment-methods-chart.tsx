"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { paymentMethodsData } from "@/lib/mock-data";

interface PaymentMethodsChartProps {
  data?: Array<{ name: string; value: number; color: string }>;
  centerValue?: string;
}

export function PaymentMethodsChart({
  data = paymentMethodsData,
  centerValue = "$24,560",
}: PaymentMethodsChartProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
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
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-base font-bold tabular-nums text-white">{centerValue}</p>
          <p className="text-[11px] text-drift-muted">Total</p>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {data.map((item) => (
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
