"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tablesDB, DATABASE_ID, ORDERS_TABLE_ID, ORDER_ITEMS_TABLE_ID, Query } from "@/lib/appwrite";
import { Order } from "@/lib/types";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface EditOrderDialogProps {
    order: Order | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function EditOrderDialog({
    order,
    open,
    onOpenChange,
    onSuccess,
}: EditOrderDialogProps) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<Order["status"]>("pending");
    const [totalPrice, setTotalPrice] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    useEffect(() => {
        if (order) {
            setStatus(order.status);
            setTotalPrice(order.total_price.toString());

            // Fetch existing notes from the first order item
            const fetchNotes = async () => {
                try {
                    const items = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDER_ITEMS_TABLE_ID, queries: [Query.equal("order_id", order.$id), Query.limit(1)] });
                    if (items.rows.length > 0) {
                        setNotes(items.rows[0].notes || "");
                    }
                } catch (error) {
                    console.error("Error fetching notes:", error);
                }
            };
            fetchNotes();
        }
    }, [order]);

    const handleSave = async () => {
        if (!order) return;

        setLoading(true);
        try {
            const price = parseFloat(totalPrice);
            if (isNaN(price) || price < 0) {
                toast.error("Please enter a valid price");
                setLoading(false);
                return;
            }

            await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: ORDERS_TABLE_ID, rowId: order.$id, data: {
                                status: status,
                                total_price: price,
                            } });

            // Update notes for all order items
            const items = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: ORDER_ITEMS_TABLE_ID, queries: [Query.equal("order_id", order.$id)] });

            await Promise.all(
                items.rows.map((item) =>
                    tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: ORDER_ITEMS_TABLE_ID, rowId: item.$id, data: { notes: notes } })
                )
            );

            toast.success("Order updated successfully");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Failed to update order");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Order</DialogTitle>
                    <DialogDescription>
                        Make changes to the order details here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            Status
                        </Label>
                        <Select
                            value={status}
                            onValueChange={(value: string) => setStatus(value as Order["status"])}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="returned">Returned</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">
                            Total Price
                        </Label>
                        <Input
                            id="price"
                            type="number"
                            value={totalPrice}
                            onChange={(e) => setTotalPrice(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">
                            Notes
                        </Label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="col-span-3 flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Order notes..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
