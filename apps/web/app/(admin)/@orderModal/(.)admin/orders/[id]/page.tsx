import AdminOrderDetails from "@/components/admin/AdminOrderDetails";
import AdminOrderRouteModal from "@/components/admin/AdminOrderRouteModal";

export default async function AdminOrderModalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminOrderRouteModal>
      <AdminOrderDetails orderId={id} />
    </AdminOrderRouteModal>
  );
}
