import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/dashboard/placeholder-page";

const PLACEHOLDER_PAGES: Record<string, { title: string; subtitle: string }> = {};

export function generateStaticParams() {
  return Object.keys(PLACEHOLDER_PAGES).map((slug) => ({ slug }));
}

export default function DashboardSlugPage({ params }: { params: { slug: string } }) {
  const page = PLACEHOLDER_PAGES[params.slug];
  if (!page) notFound();
  return <PlaceholderPage title={page.title} subtitle={page.subtitle} />;
}
