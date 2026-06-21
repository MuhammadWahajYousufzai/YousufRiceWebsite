import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminOrderDetails from "@/components/admin/AdminOrderDetails";
import { Button } from "@/components/ui/button";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Button asChild variant="outline" size="sm" className="mb-5">
        <Link href="/admin/orders">
          <ArrowLeft className="h-4 w-4" />
          Back to order management
        </Link>
      </Button>
      <AdminOrderDetails orderId={id} />
    </main>
  );
}
