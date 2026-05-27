"use client";

import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { tablesDB, DATABASE_ID, ORDERS_TABLE_ID } from "@/lib/appwrite";
import { LoyaltyService } from "@/lib/services/loyalty-service";
import { OrderService } from "@/lib/services/order-service";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface DeleteOrderDialogProps {
    orderId: string;
    customerName?: string;
    customerPhone?: string;
    address?: string;
    totalWeightKg?: number | string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function DeleteOrderDialog({
    orderId,
    customerName,
    customerPhone,
    address,
    totalWeightKg,
    open,
    onOpenChange,
    onSuccess,
}: DeleteOrderDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            // Use OrderService to delete order and all related items
            await OrderService.deleteOrder(orderId);
            toast.success("Order deleted successfully");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error deleting order:", error);
            toast.error("Failed to delete order");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>This action cannot be undone. This will permanently delete the following order from the database.</p>
                            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 space-y-1">
                                {customerName && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-600 font-semibold">Customer:</span>
                                        <span className="font-medium">{customerName}</span>
                                    </div>
                                )}
                                {customerPhone && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-600 font-semibold">Phone:</span>
                                        <span className="font-medium">{customerPhone}</span>
                                    </div>
                                )}
                                {address && (
                                    <div className="flex items-start gap-2">
                                        <span className="text-red-600 font-semibold shrink-0">Address:</span>
                                        <span className="font-medium">{address}</span>
                                    </div>
                                )}
                                {totalWeightKg !== undefined && totalWeightKg !== null && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-600 font-semibold">Order Size:</span>
                                        <span className="font-medium">{totalWeightKg} kg</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="text-red-600 font-semibold">Order ID:</span>
                                    <span className="font-mono text-xs">{orderId}</span>
                                </div>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            "Delete Order"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
