"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { paymentMethodsData } from "@/lib/mock-data";

export function PaymentMethodsChart() {
  return (
    <div className="flex flex-col">
      <div className="relative h-[160px] min-h-[160px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={paymentMethodsData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {paymentMethodsData.map((entry, index) => (
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
          <p className="text-sm font-semibold tabular-nums text-white">$24,560</p>
          <p className="text-2xs text-drift-muted">Total</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 border-t border-drift-border pt-3">
        {paymentMethodsData.map((item) => (
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
