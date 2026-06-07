"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { paymentMethodsData } from "@/lib/mock-data";

export function PaymentMethodsChart() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[200px] min-h-[200px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={paymentMethodsData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {paymentMethodsData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#12121a",
                border: "1px solid #1e1e2e",
                borderRadius: "8px",
                color: "#fff",
              }}
              formatter={(value) => [`${value}%`, "Share"]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-lg font-bold text-white">$24,560</p>
          <p className="text-xs text-drift-muted">Total</p>
        </div>
      </div>
      <div className="mt-4 w-full space-y-2">
        {paymentMethodsData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-drift-muted">{item.name}</span>
            </div>
            <span className="font-medium text-white">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
