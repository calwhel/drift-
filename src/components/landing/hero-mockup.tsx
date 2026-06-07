import { cn } from "@/lib/utils";

interface HeroMockupProps {
  className?: string;
  style?: React.CSSProperties;
}

export function HeroMockup({ className, style }: HeroMockupProps) {
  const stats = [
    { label: "Total Gross", value: "$24,560", change: "+12.5%", up: true },
    { label: "Total Payments", value: "356", change: "+8.2%", up: true },
    { label: "Completed", value: "342", change: "+9.1%", up: true },
    { label: "Pending", value: "14", change: "-2.1%", up: false },
  ];

  const chartBars = [42, 58, 48, 72, 62, 85, 78, 92, 88, 95];

  const transactions = [
    { id: "TXN_8B527", customer: "Sarah J.", amount: "120 USDT", status: "Completed" },
    { id: "TXN_3A918", customer: "Michael C.", amount: "0.0045 BTC", status: "Completed" },
    { id: "TXN_7F204", customer: "Emma W.", amount: "250 USDC", status: "Pending" },
  ];

  return (
    <div
      className={cn(
        "relative w-[580px] overflow-hidden rounded-lg border border-[#2a2a38] bg-[#111118] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7)]",
        className
      )}
      style={style}
    >
      <div className="flex items-center gap-1.5 border-b border-[#1e1e2e] bg-[#0d0d14] px-3 py-2">
        <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-3 h-5 flex-1 rounded bg-[#1a1a24] text-center text-[9px] leading-5 text-[#6b7280]">
          app.drift.payment/dashboard
        </div>
      </div>

      <div className="flex h-[340px]">
        <div className="w-[130px] shrink-0 border-r border-[#1e1e2e] bg-[#0a0a0f] p-2.5">
          <div className="mb-3 flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#7c3aed] text-[8px] font-bold text-white">D</div>
            <span className="text-[9px] font-bold text-white">DRIFT</span>
          </div>
          {["Overview", "Transactions", "Payment Links", "Wallets", "Customers"].map((item, i) => (
            <div
              key={item}
              className={`mb-0.5 rounded px-2 py-1 text-[9px] ${
                i === 0 ? "bg-[#7c3aed] text-white" : "text-[#6b7280]"
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden p-2.5">
          <p className="text-[10px] font-semibold text-white">Overview</p>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {stats.map((s) => (
              <div key={s.label} className="rounded border border-[#1e1e2e] bg-[#0d0d14] px-2 py-1.5">
                <p className="text-[7px] text-[#6b7280]">{s.label}</p>
                <p className="text-[10px] font-semibold tabular-nums text-white">{s.value}</p>
                <p className={`text-[7px] ${s.up ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{s.change}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-5 gap-1.5">
            <div className="col-span-3 rounded border border-[#1e1e2e] bg-[#0d0d14] p-2">
              <p className="text-[8px] text-[#6b7280]">Payment Overview</p>
              <div className="mt-1 flex h-[72px] items-end gap-px">
                {chartBars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-[#7c3aed]/50" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            <div className="col-span-2 rounded border border-[#1e1e2e] bg-[#0d0d14] p-2">
              <p className="text-[8px] text-[#6b7280]">Payment Methods</p>
              <div className="relative mx-auto mt-1 h-14 w-14">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#1e1e2e" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray="53 100" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="22 100" strokeDashoffset="-53" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="9 100" strokeDashoffset="-75" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[7px] font-semibold text-white">$24k</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 rounded border border-[#1e1e2e] bg-[#0d0d14] p-2">
            <p className="mb-1 text-[8px] text-[#6b7280]">Recent Transactions</p>
            <table className="w-full text-[7px]">
              <thead>
                <tr className="text-[#6b7280]">
                  <th className="pb-1 text-left font-medium">ID</th>
                  <th className="pb-1 text-left font-medium">Customer</th>
                  <th className="pb-1 text-left font-medium">Amount</th>
                  <th className="pb-1 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-t border-[#1e1e2e] text-white">
                    <td className="py-0.5 font-mono text-[#7c3aed]">{tx.id}</td>
                    <td className="py-0.5">{tx.customer}</td>
                    <td className="py-0.5 tabular-nums">{tx.amount}</td>
                    <td className={`py-0.5 ${tx.status === "Completed" ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>
                      {tx.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
