import { cn } from "@/lib/utils";
import { LogoMarkCompact } from "./logo-mark";

interface HeroMockupProps {
  className?: string;
  style?: React.CSSProperties;
}

const LINE_POINTS = "4,52 18,44 32,48 46,32 60,36 74,22 88,26 102,14 116,18 130,8 144,12 158,6 172,10 186,4";

export function HeroMockup({ className, style }: HeroMockupProps) {
  const stats = [
    { label: "Total Gross", value: "$24,560", change: "+12.5%", up: true },
    { label: "Total Payments", value: "356", change: "+8.2%", up: true },
    { label: "Completed", value: "342", change: "+9.1%", up: true },
    { label: "Pending", value: "14", change: "-2.1%", up: false },
  ];

  const transactions = [
    { id: "TXN_8B527", customer: "Sarah J.", amount: "120 USDT", status: "Completed" },
    { id: "TXN_3A918", customer: "Michael C.", amount: "0.0045 BTC", status: "Completed" },
    { id: "TXN_7F204", customer: "Emma W.", amount: "250 USDC", status: "Pending" },
  ];

  return (
    <div
      className={cn(
        "relative w-[620px] overflow-hidden rounded-xl border border-[#2a2a38]/80 bg-[#111118] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85),0_0_60px_rgba(124,58,237,0.15)]",
        className
      )}
      style={style}
    >
      <div className="flex items-center gap-1.5 border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-2.5">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="ml-3 h-6 flex-1 rounded-md bg-[#1a1a24] text-center text-[10px] leading-6 text-[#6b7280]">
          app.drift.payment/dashboard
        </div>
      </div>

      <div className="flex h-[380px]">
        <div className="w-[140px] shrink-0 border-r border-[#1e1e2e] bg-[#0a0a0f] p-3">
          <LogoMarkCompact className="mb-4" />
          {["Overview", "Transactions", "Payment Links", "Wallets", "Customers"].map((item, i) => (
            <div
              key={item}
              className={`mb-1 rounded-md px-2.5 py-1.5 text-[10px] ${
                i === 0 ? "bg-[#7c3aed] font-medium text-white" : "text-[#6b7280]"
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden p-3">
          <p className="text-[11px] font-semibold text-white">Overview</p>

          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-[#1e1e2e] bg-[#0d0d14] px-2 py-2">
                <p className="text-[8px] text-[#6b7280]">{s.label}</p>
                <p className="text-[11px] font-semibold tabular-nums text-white">{s.value}</p>
                <p className={`text-[8px] font-medium ${s.up ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {s.change}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2.5 grid grid-cols-5 gap-2">
            <div className="col-span-3 rounded-lg border border-[#1e1e2e] bg-[#0d0d14] p-2.5">
              <p className="text-[9px] text-[#6b7280]">Payment Overview</p>
              <svg viewBox="0 0 190 60" className="mt-1 h-[80px] w-full">
                <defs>
                  <linearGradient id="heroLineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon fill="url(#heroLineFill)" points={`${LINE_POINTS} 186,60 4,60`} />
                <polyline
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={LINE_POINTS}
                />
                {LINE_POINTS.split(" ").map((pt, i) => {
                  const [x, y] = pt.split(",").map(Number);
                  return <circle key={i} cx={x} cy={y} r="2.5" fill="#a855f7" stroke="#0d0d14" strokeWidth="1" />;
                })}
              </svg>
            </div>

            <div className="col-span-2 rounded-lg border border-[#1e1e2e] bg-[#0d0d14] p-2.5">
              <p className="text-[9px] text-[#6b7280]">Payment Methods</p>
              <div className="relative mx-auto mt-2 h-16 w-16">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#1e1e2e" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray="53 100" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="22 100" strokeDashoffset="-53" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="9 100" strokeDashoffset="-75" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-semibold text-white">$24k</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 rounded-lg border border-[#1e1e2e] bg-[#0d0d14] p-2.5">
            <p className="mb-1.5 text-[9px] text-[#6b7280]">Recent Transactions</p>
            <table className="w-full text-[8px]">
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
                    <td className="py-1 font-mono text-[#a78bfa]">{tx.id}</td>
                    <td className="py-1">{tx.customer}</td>
                    <td className="py-1 tabular-nums">{tx.amount}</td>
                    <td className={`py-1 font-medium ${tx.status === "Completed" ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>
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
