export type TransactionStatus = "Completed" | "Pending" | "Failed";

export interface Transaction {
  id: string;
  customer: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  date: string;
}

export interface Wallet {
  id: string;
  name: string;
  subtitle: string;
  symbol: string;
  balance: number;
  balanceDisplay: string;
  usdValue: number;
  network: string;
  address: string;
  addressDisplay: string;
  isPrimary?: boolean;
  color: string;
}

export interface PaymentLink {
  id: string;
  title: string;
  url: string;
  priceDisplay: string;
  amount: number;
  currency: string;
  date: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const navItems = [
  { label: "Overview", href: "/dashboard/overview", icon: "LayoutDashboard" },
  { label: "Transactions", href: "/dashboard/transactions", icon: "ArrowRightLeft" },
  { label: "Payment Links", href: "/dashboard/payment-links", icon: "Link" },
  { label: "Wallets", href: "/dashboard/wallets", icon: "Wallet" },
  { label: "Customers", href: "/dashboard/customers", icon: "Users" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "API Keys", href: "/dashboard/api-keys", icon: "Key" },
  { label: "Invoices", href: "/dashboard/invoices", icon: "FileText" },
  { label: "Payouts", href: "/dashboard/payouts", icon: "CreditCard" },
  { label: "Customer Subscriptions", href: "/dashboard/subscriptions", icon: "RefreshCcw" },
  { label: "Webhooks", href: "/dashboard/webhooks", icon: "Webhook" },
  { label: "Help & Contact", href: "/dashboard/support", icon: "Headphones" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
];

export interface StatCardData {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  sub: string;
  icon: string;
  color: "purple" | "blue" | "green" | "orange";
}

export const statsCards: StatCardData[] = [
  { label: "Total Gross", value: "$24,560.00", change: "+12.5%", positive: true, sub: "vs Apr 1 – Apr 30", icon: "DollarSign", color: "purple" },
  { label: "Total Payments", value: "356", change: "+8.2%", positive: true, sub: "vs Apr 1 – Apr 30", icon: "CreditCard", color: "blue" },
  { label: "Completed", value: "342", change: "+9.1%", positive: true, sub: "vs Apr 1 – Apr 30", icon: "CheckCircle", color: "green" },
  { label: "Pending", value: "14", change: "-2.1%", positive: false, sub: "vs Apr 1 – Apr 30", icon: "Clock", color: "orange" },
];

export const revenueData = [
  { label: "May 1", value: 3200 },
  { label: "May 3", value: 5400 },
  { label: "May 6", value: 4800 },
  { label: "May 9", value: 7600 },
  { label: "May 11", value: 6900 },
  { label: "May 14", value: 9800 },
  { label: "May 16", value: 11200 },
  { label: "May 19", value: 10400 },
  { label: "May 21", value: 13800 },
  { label: "May 24", value: 15600 },
  { label: "May 26", value: 18200 },
  { label: "May 29", value: 21400 },
  { label: "May 31", value: 24560 },
];

export const paymentMethodsData = [
  { name: "USDT", value: 60.5, color: "#22c55e" },
  { name: "BTC", value: 25.3, color: "#f59e0b" },
  { name: "USDC", value: 10.2, color: "#3b82f6" },
  { name: "Others", value: 4.0, color: "#a855f7" },
];

export const transactions: Transaction[] = [
  { id: "TXN_88527F102", customer: "Alex Johnson", amount: 120.0, currency: "USDT", status: "Completed", date: "May 31, 9:41 AM" },
  { id: "TXN_d7e8e2a7c", customer: "Block Solutions", amount: 0.0021, currency: "BTC", status: "Completed", date: "May 31, 8:23 AM" },
  { id: "TXN_1c59d7f6e", customer: "Crypto Store", amount: 250.0, currency: "USDC", status: "Completed", date: "May 31, 8:05 AM" },
  { id: "TXN_3a1b2c3d4", customer: "Jane Smith", amount: 75.5, currency: "USDT", status: "Pending", date: "May 31, 8:03 AM" },
  { id: "TXN_7f3d6a2b1", customer: "Web3 Devs", amount: 0.0015, currency: "BTC", status: "Completed", date: "May 30, 6:21 PM" },
  { id: "TXN_9b8a7c6d5", customer: "Digital Agency", amount: 500.0, currency: "USDC", status: "Completed", date: "May 30, 4:11 PM" },
  { id: "TXN_2c4d6e8f9", customer: "John Carter", amount: 200.0, currency: "USDT", status: "Completed", date: "May 30, 2:38 PM" },
  { id: "TXN_a1b2c3d4e", customer: "Satoshi Labs", amount: 0.0008, currency: "BTC", status: "Failed", date: "May 30, 1:02 PM" },
  { id: "TXN_f0e1d2c3b", customer: "NFT Collection", amount: 150.0, currency: "USDC", status: "Completed", date: "May 29, 11:45 AM" },
  { id: "TXN_4d3c2b1a0", customer: "Mike Wilson", amount: 60.0, currency: "USDT", status: "Completed", date: "May 29, 9:32 AM" },
];

export const TRANSACTIONS_TOTAL = 356;

export const wallets: Wallet[] = [
  { id: "1", name: "USDT Wallet", subtitle: "Tether USD", symbol: "USDT", balance: 12650, balanceDisplay: "12,650 USDT", usdValue: 12650.0, network: "TRC20", address: "TXd7f9Q8mR2ygJ6K1b8v5d3f9a23a2b1c", addressDisplay: "TXd7f...3a2b1c", isPrimary: true, color: "#22c55e" },
  { id: "2", name: "BTC Wallet", subtitle: "Bitcoin", symbol: "BTC", balance: 0.5123, balanceDisplay: "0.5123 BTC", usdValue: 11430.25, network: "Bitcoin", address: "bc1q9xy2kgdygjrsqtzq2n0yrf24af3d2e", addressDisplay: "bc1q9...af3d2e", color: "#f59e0b" },
  { id: "3", name: "USDC Wallet", subtitle: "USD Coin", symbol: "USDC", balance: 350, balanceDisplay: "350.00 USDC", usdValue: 350.0, network: "ERC20", address: "0xA7bF35Cc6634C0532925a3b844Bc9e8e2d4f", addressDisplay: "0xA7bF...8e2d4f", color: "#3b82f6" },
  { id: "4", name: "ETH Wallet", subtitle: "Ethereum", symbol: "ETH", balance: 1.25, balanceDisplay: "1.2500 ETH", usdValue: 2129.75, network: "ERC20", address: "0xA7bF35Cc6634C0532925a3b844Bc9e8e2d4f", addressDisplay: "0xA7bF...8e2d4f", color: "#8b5cf6" },
  { id: "5", name: "BNB Wallet", subtitle: "BNB Smart Chain", symbol: "BNB", balance: 5.3, balanceDisplay: "5.3000 BNB", usdValue: 1999.0, network: "BEP20", address: "0xA7bF35Cc6634C0532925a3b844Bc9e8e2d4f", addressDisplay: "0xA7bF...8e2d4f", color: "#eab308" },
];

export const walletChartData = [
  { day: "Day 1", balance: 21800 },
  { day: "Day 5", balance: 22400 },
  { day: "Day 9", balance: 21900 },
  { day: "Day 13", balance: 22800 },
  { day: "Day 17", balance: 22300 },
  { day: "Day 21", balance: 23600 },
  { day: "Day 25", balance: 23100 },
  { day: "Day 28", balance: 24100 },
  { day: "Day 30", balance: 24560 },
];

export const recentLinks: PaymentLink[] = [
  { id: "1", title: "Premium Membership", url: "drift.to/pay/abc123", priceDisplay: "$120.00", amount: 120.0, currency: "USDT", date: "May 31, 9:41 AM" },
  { id: "2", title: "Consulting Service", url: "drift.to/pay/def456", priceDisplay: "$350.00", amount: 350.0, currency: "USDT", date: "May 30, 4:21 PM" },
  { id: "3", title: "Digital Product", url: "drift.to/pay/ghi789", priceDisplay: "$49.00", amount: 49.0, currency: "USDC", date: "May 29, 11:02 AM" },
];

export interface ActivityItem {
  type: "received" | "withdrawal";
  title: string;
  party: string;
  amount: string;
  positive: boolean;
  date: string;
}

export const recentActivity: ActivityItem[] = [
  { type: "received", title: "Payment Received", party: "From: Alex Johnson", amount: "+120.00 USDT", positive: true, date: "May 31, 9:41 AM" },
  { type: "received", title: "Payment Received", party: "From: Crypto Store", amount: "+250.00 USDC", positive: true, date: "May 31, 8:05 AM" },
  { type: "withdrawal", title: "Withdrawal", party: "To: bc1q9...af3d2e", amount: "-0.1000 BTC", positive: false, date: "May 30, 6:21 PM" },
  { type: "received", title: "Payment Received", party: "From: Jane Smith", amount: "+75.50 USDT", positive: true, date: "May 30, 3:14 PM" },
];

export interface QuickAction {
  label: string;
  description?: string;
  icon: string;
  color: "purple" | "blue" | "green" | "orange";
  href: string;
}

export const overviewQuickActions: QuickAction[] = [
  { label: "Create Payment Link", icon: "Link2", color: "purple", href: "/dashboard/payment-links" },
  { label: "Create Invoice", icon: "FileText", color: "blue", href: "/dashboard/invoices" },
  { label: "Manage Wallets", icon: "Wallet", color: "green", href: "/dashboard/wallets" },
  { label: "Add Customer", icon: "Users", color: "orange", href: "/dashboard/payment-links" },
];

export const transactionsQuickActions: QuickAction[] = [
  { label: "Create Payment Link", description: "Get paid with a simple link", icon: "Link2", color: "purple", href: "/dashboard/payment-links" },
  { label: "Create Invoice", description: "Send a professional invoice", icon: "FileText", color: "blue", href: "/dashboard/invoices" },
  { label: "Create Wallet", description: "Generate a new wallet", icon: "Wallet", color: "green", href: "/dashboard/wallets" },
  { label: "Add Customer", description: "Create a payment link", icon: "Users", color: "orange", href: "/dashboard/payment-links" },
];

export const walletQuickActions: QuickAction[] = [
  { label: "Deposit Crypto", description: "Add funds to your wallet", icon: "ArrowDownLeft", color: "green", href: "/dashboard/wallets" },
  { label: "Withdraw Funds", description: "Transfer to external wallet", icon: "ArrowUpRight", color: "purple", href: "/dashboard/payouts" },
  { label: "Transfer Between Wallets", description: "Move funds instantly", icon: "ArrowRightLeft", color: "blue", href: "/dashboard/wallets" },
  { label: "View Address", description: "View all wallet addresses", icon: "Eye", color: "orange", href: "/dashboard/wallets" },
];

export const paymentMethods = [
  { id: "usdt", label: "USDT", network: "TRC20", color: "#22c55e" },
  { id: "btc", label: "BTC", network: "Bitcoin", color: "#f59e0b" },
  { id: "usdc", label: "USDC", network: "ERC20", color: "#3b82f6" },
  { id: "eth", label: "ETH", network: "Ethereum", color: "#8b5cf6" },
];

export const checkoutFeatures = [
  "Full Access to All Content",
  "Exclusive Member Benefits",
  "Priority Support",
  "Cancel Anytime",
];

export const demoCheckout = {
  title: "Premium Membership",
  badge: "Premium Access",
  description: "Access to premium content, features and exclusive benefits.",
  amount: "120.00",
  currency: "USDT",
  network: "TRC20",
  usdApprox: "120.00",
  deposit_address: "TPa7x6h9Q8mR2ygJ6K1b8v5d3f9a2e1c7",
};

export const trustedLogos = [
  { name: "CoinRank", icon: "Coins" },
  { name: "Morph", icon: "Boxes" },
  { name: "BlockNext", icon: "Box" },
  { name: "ShadowPay", icon: "Sparkles" },
  { name: "Cryptify", icon: "Hexagon" },
  { name: "ApexPay", icon: "Triangle" },
  { name: "ChainFlow", icon: "Workflow" },
  { name: "X Wallet", icon: "X" },
];

export const landingFeatures = [
  { title: "Multiple Payment Options", description: "Accept BTC, USDT, USDC and more with ease.", icon: "Grid3x3" },
  { title: "Real-time Tracking", description: "Track payments in real-time with instant notifications.", icon: "Zap" },
  { title: "Recurring Billing", description: "Offer subscription plans to your customers through Drift.", icon: "RefreshCcw" },
  { title: "Easy Integration", description: "Integrate in minutes with our API or payment links.", icon: "Puzzle" },
  { title: "Secure & Reliable", description: "Enterprise grade security you can count on.", icon: "Shield" },
];

export const heroFeatures = [
  { label: "Easy Integration", icon: "Puzzle" },
  { label: "Instant Payments", icon: "Zap" },
  { label: "Global Reach", icon: "Globe" },
  { label: "Secure & Reliable", icon: "Shield" },
];
