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
  symbol: string;
  balance: number;
  usdValue: number;
  network: string;
  address: string;
  isPrimary?: boolean;
  color: string;
}

export interface PaymentLink {
  id: string;
  title: string;
  url: string;
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
  { label: "Overview", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Transactions", href: "/dashboard/transactions", icon: "ArrowRightLeft" },
  { label: "Payment Links", href: "/dashboard/payment-links", icon: "Link" },
  { label: "Wallets", href: "/dashboard/wallets", icon: "Wallet" },
  { label: "Customers", href: "/dashboard/customers", icon: "Users" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3" },
  { label: "API Keys", href: "/dashboard/api-keys", icon: "Key" },
  { label: "Invoices", href: "/dashboard/invoices", icon: "FileText" },
  { label: "Payouts", href: "/dashboard/payouts", icon: "CreditCard" },
  { label: "Subscriptions", href: "/dashboard/subscriptions", icon: "RefreshCcw" },
  { label: "Webhooks", href: "/dashboard/webhooks", icon: "Webhook" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
];

export const statsCards = [
  { label: "Total Gross", value: "$24,560.00", change: "+12.5%", positive: true, icon: "DollarSign", color: "purple" },
  { label: "Total Payments", value: "356", change: "+8.2%", positive: true, icon: "CreditCard", color: "blue" },
  { label: "Completed", value: "342", change: "+9.1%", positive: true, icon: "CheckCircle", color: "green" },
  { label: "Pending", value: "14", change: "-2.1%", positive: false, icon: "Clock", color: "orange" },
  { label: "Customers", value: "128", change: "+15.3%", positive: true, icon: "Users", color: "purple" },
];

export const revenueData = [
  { date: "May 1", revenue: 820 },
  { date: "May 5", revenue: 1100 },
  { date: "May 10", revenue: 980 },
  { date: "May 15", revenue: 1450 },
  { date: "May 20", revenue: 1200 },
  { date: "May 25", revenue: 1680 },
  { date: "May 31", revenue: 1920 },
];

export const paymentMethodsData = [
  { name: "USDT", value: 60.5, color: "#22c55e" },
  { name: "BTC", value: 25.3, color: "#f59e0b" },
  { name: "USDC", value: 10.2, color: "#3b82f6" },
  { name: "Others", value: 4.0, color: "#7c3aed" },
];

export const transactions: Transaction[] = [
  { id: "TXN_8B527F102", customer: "Sarah Johnson", amount: 120.0, currency: "USDT", status: "Completed", date: "May 31, 9:41 AM" },
  { id: "TXN_3A918D204", customer: "Michael Chen", amount: 0.0045, currency: "BTC", status: "Completed", date: "May 31, 8:22 AM" },
  { id: "TXN_7F204A891", customer: "Emma Williams", amount: 250.0, currency: "USDC", status: "Pending", date: "May 30, 11:15 PM" },
  { id: "TXN_1C563B772", customer: "James Rodriguez", amount: 89.99, currency: "USDT", status: "Completed", date: "May 30, 6:30 PM" },
  { id: "TXN_9D847E331", customer: "Lisa Anderson", amount: 500.0, currency: "USDT", status: "Failed", date: "May 30, 3:45 PM" },
  { id: "TXN_2E691F445", customer: "David Kim", amount: 0.012, currency: "BTC", status: "Completed", date: "May 30, 1:20 PM" },
  { id: "TXN_5B378A902", customer: "Anna Martinez", amount: 175.0, currency: "USDC", status: "Completed", date: "May 29, 10:55 AM" },
  { id: "TXN_8A204C118", customer: "Robert Taylor", amount: 320.0, currency: "USDT", status: "Pending", date: "May 29, 9:10 AM" },
  { id: "TXN_4F917D663", customer: "Jennifer Lee", amount: 45.5, currency: "USDT", status: "Completed", date: "May 28, 7:40 PM" },
  { id: "TXN_6C285E774", customer: "Chris Brown", amount: 0.008, currency: "BTC", status: "Completed", date: "May 28, 4:15 PM" },
  { id: "TXN_3D496F885", customer: "Maria Garcia", amount: 199.0, currency: "USDC", status: "Completed", date: "May 28, 2:30 PM" },
  { id: "TXN_1B607A996", customer: "Thomas Wilson", amount: 75.0, currency: "USDT", status: "Failed", date: "May 27, 11:00 AM" },
];

export const wallets: Wallet[] = [
  { id: "1", name: "USDT Wallet", symbol: "USDT", balance: 14850.5, usdValue: 14850.5, network: "TRC20", address: "TPa7x6h9Q8mR2ygJ6K1b8v5d3f9a2e1c7", isPrimary: true, color: "#22c55e" },
  { id: "2", name: "Bitcoin Wallet", symbol: "BTC", balance: 0.5123, usdValue: 11430.25, network: "Bitcoin", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", color: "#f59e0b" },
  { id: "3", name: "USDC Wallet", symbol: "USDC", balance: 3250.0, usdValue: 3250.0, network: "ERC20", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", color: "#3b82f6" },
  { id: "4", name: "Ethereum Wallet", symbol: "ETH", balance: 1.245, usdValue: 2890.0, network: "ERC20", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", color: "#a78bfa" },
  { id: "5", name: "BNB Wallet", symbol: "BNB", balance: 12.5, usdValue: 3125.0, network: "BEP20", address: "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3", color: "#f59e0b" },
];

export const walletChartData = [
  { day: "Mon", balance: 22000 },
  { day: "Tue", balance: 22500 },
  { day: "Wed", balance: 21800 },
  { day: "Thu", balance: 23200 },
  { day: "Fri", balance: 22800 },
  { day: "Sat", balance: 24100 },
  { day: "Sun", balance: 24560 },
];

export const recentLinks: PaymentLink[] = [
  { id: "1", title: "Premium Membership", url: "drift.to/pay/abc123", amount: 120.0, currency: "USDT", date: "May 31, 2024" },
  { id: "2", title: "Consulting Session", url: "drift.to/pay/def456", amount: 250.0, currency: "USDT", date: "May 30, 2024" },
  { id: "3", title: "Product Purchase", url: "drift.to/pay/ghi789", amount: 89.99, currency: "USDC", date: "May 29, 2024" },
];

export const recentActivity = [
  { type: "received", title: "Payment Received", from: "Sarah Johnson", amount: "+120.00 USDT", date: "2 min ago" },
  { type: "withdrawal", title: "Withdrawal", from: "bc1qxy2kg...wlh", amount: "-0.1000 BTC", date: "1 hour ago" },
  { type: "received", title: "Payment Received", from: "Michael Chen", amount: "+0.0045 BTC", date: "3 hours ago" },
  { type: "received", title: "Payment Received", from: "Emma Williams", amount: "+250.00 USDC", date: "5 hours ago" },
];

export const paymentMethods = [
  { id: "usdt", label: "USDT", network: "TRC20", color: "#22c55e" },
  { id: "btc", label: "BTC", network: "Bitcoin", color: "#f59e0b" },
  { id: "usdc", label: "USDC", network: "ERC20", color: "#3b82f6" },
  { id: "eth", label: "ETH", network: "Ethereum", color: "#a78bfa" },
];

export const checkoutFeatures = [
  "Full Access to All Content",
  "Exclusive Member Benefits",
  "Priority Support",
  "Cancel Anytime",
];

export const trustedLogos = [
  "CoinRank", "Morph", "BlockNext", "ShadowPay",
  "Cryptify", "ApexPay", "ChainFlow", "X Wallet",
];

export const landingFeatures = [
  { title: "Multiple Payment Options", description: "Accept BTC, ETH, USDT, USDC and 50+ cryptocurrencies with automatic conversion.", icon: "Grid3x3" },
  { title: "Real-time Tracking", description: "Monitor every transaction in real-time with instant notifications and webhooks.", icon: "Zap" },
  { title: "Easy Integration", description: "Simple REST API and SDKs for Node.js, Python, and more. Go live in minutes.", icon: "Puzzle" },
  { title: "Secure & Reliable", description: "Bank-grade encryption, multi-sig wallets, and 99.9% uptime guarantee.", icon: "Shield" },
];

export const heroFeatures = [
  { label: "Easy Integration", icon: "Code" },
  { label: "Instant Payments", icon: "Zap" },
  { label: "Global Reach", icon: "Globe" },
  { label: "Secure & Reliable", icon: "Shield" },
];
