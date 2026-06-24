import { redirect } from "next/navigation";

type SubscribePageProps = {
  params: Promise<{ shortcode: string }>;
};

export default async function SubscribePage({ params }: SubscribePageProps) {
  const { shortcode } = await params;
  redirect(`/pay/${shortcode}`);
}
