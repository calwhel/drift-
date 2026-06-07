import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

const PLACEHOLDER_PAGES: Record<string, { title: string; subtitle: string }> = {
  customers: {
    title: "Customers",
    subtitle: "Manage your customer base and payment history.",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Deep insights into your payment performance.",
  },
  "api-keys": {
    title: "API Keys",
    subtitle: "Manage API keys for your integrations.",
  },
  invoices: {
    title: "Invoices",
    subtitle: "Create and manage invoices for your customers.",
  },
  payouts: {
    title: "Payouts",
    subtitle: "Manage payouts to your bank or wallet.",
  },
  subscriptions: {
    title: "Subscriptions",
    subtitle: "Manage recurring subscription payments.",
  },
  webhooks: {
    title: "Webhooks",
    subtitle: "Configure webhook endpoints for real-time events.",
  },
  settings: {
    title: "Settings",
    subtitle: "Configure your account and business preferences.",
  },
};

export function generateStaticParams() {
  return Object.keys(PLACEHOLDER_PAGES).map((slug) => ({ slug }));
}

export default function DashboardSlugPage({ params }: { params: { slug: string } }) {
  const page = PLACEHOLDER_PAGES[params.slug];
  if (!page) notFound();
  return <PlaceholderPage title={page.title} subtitle={page.subtitle} />;
}
