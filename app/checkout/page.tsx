"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  tablesDB,
  DATABASE_ID,
  ORDERS_TABLE_ID,
  CUSTOMERS_TABLE_ID,
  ADDRESSES_TABLE_ID,
  ORDER_ITEMS_TABLE_ID,
  STORAGE_BUCKET_ID,
} from "@/lib/appwrite";
import {
  formatCurrency,
  formatOrderItems,
  generateMapsUrl,
  calculateSavings,
  calculateTierPricing,
  calculateItemTotal,
  calculatePrice,
  formatPhoneNumber,
  formatPhoneNumberForDisplay,
  validatePakistaniPhoneNumber,
} from "@/lib/utils";
import { sanitizeCustomerNameForMeta } from "@/lib/meta";
import { useMetaTracking } from "@/lib/hooks/use-meta-tracking";
import {
  getAgentLabelFromLabels,
  getOrderChannelFromAgentLabel,
} from "@/lib/tracking/order-channel";
import { ID, Query } from "appwrite";
import toast from "react-hot-toast";
import { MapPin, Gift, Check, X } from "lucide-react";
import {
  LoyaltyService,
  LoyaltyDiscount,
} from "@/lib/services/loyalty-service";
import { processLoyaltyReward } from "@/app/actions/loyalty-actions";
import Image from "next/image";

function CheckoutContent() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user, customer, checkAuth } = useAuthStore();
  const { trackPurchase } = useMetaTracking();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const agentLabel = getAgentLabelFromLabels(user?.labels);
  const isAgent = Boolean(agentLabel);
  const orderChannel = getOrderChannelFromAgentLabel(agentLabel);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    addressLine: "",
    city: "",
    otherCity: "",
    notes: "",
    latitude: 0,
    longitude: 0,
  });

  // Discount state
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] =
    useState<LoyaltyDiscount | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Ref to track if order has been placed to prevent redirect to cart
  const isOrderPlacedRef = useRef(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Auto-fill customer information if logged in (SKIP FOR AGENTS)
  useEffect(() => {
    if (user && !isAgent) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        phone: user.phone
          ? formatPhoneNumberForDisplay(user.phone)
          : prev.phone,
        email: user.email || prev.email,
      }));
    }
  }, [user, isAgent]);

  useEffect(() => {
    // Only redirect if items are empty AND order hasn't been placed
    if (items.length === 0 && !isOrderPlacedRef.current) {
      router.push("/cart");
    }
  }, [items, router]);

  const handleGetLocation = () => {
    setGettingLocation(true);

    // Check if geolocation is supported
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }

    // Check if page is served over HTTPS or localhost
    const isSecureContext = window.isSecureContext;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    console.log("Security context:", { isSecureContext, protocol, hostname });

    if (
      !isSecureContext &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1"
    ) {
      toast.error(
        "⚠️ Geolocation requires HTTPS! Current URL is not secure. " +
          "Please access via HTTPS or localhost.",
        { duration: 8000 },
      );
      console.error(
        "Insecure context - Geolocation requires HTTPS or localhost",
      );
      setGettingLocation(false);
      return;
    }

    // Request high accuracy location with timeout and retry
    const options = {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 10000, // Wait up to 10 seconds
      maximumAge: 0, // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Check if accuracy is reasonable
        if (accuracy > 1000) {
          // Very poor accuracy (>1km) - likely using cell towers only
          toast(
            `Low GPS accuracy (${Math.round(accuracy)}m). Please enable location, move outside.`,
            { duration: 8000 },
          );

          console.warn("Very low accuracy - GPS not available:", {
            latitude,
            longitude,
            accuracy,
          });
          // Don't save this inaccurate location
          setGettingLocation(false);
          return;
        } else if (accuracy > 100) {
          // Moderate accuracy - warn but allow
          toast(
            `Low accuracy (${Math.round(accuracy)}m). • Go outdoors\n` +
              `• Enable GPS\n` +
              `• Or try again`,
            { duration: 4000 },
          );
          console.warn("Low accuracy location:", {
            latitude,
            longitude,
            accuracy,
          });
        } else if (accuracy > 50) {
          // Acceptable accuracy
          toast.success(
            `Location captured (Accuracy: ${Math.round(accuracy)}m - Fair)`,
            {
              duration: 4000,
            },
          );
        } else {
          // Good accuracy
          toast.success(
            `✓ Location captured! (Accuracy: ${Math.round(
              accuracy,
            )}m - Excellent)`,
            {
              duration: 4000,
            },
          );
        }

        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        setGettingLocation(false);
      },
      (error) => {
        let errorMessage = "Failed to get location. ";

        // Log detailed error information
        console.error("Geolocation error details:", {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT,
        });

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage +=
              "Please allow location access in your browser settings.";
            console.error("Permission denied - User blocked location access");
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage +=
              "Location information is unavailable. Check if location services are enabled on your device.";
            console.error(
              "Position unavailable - GPS/location services may be disabled",
            );
            break;
          case 3: // TIMEOUT
            errorMessage +=
              "Location request timed out. Try again or move to a location with better GPS signal.";
            console.error("Timeout - Could not get location within 10 seconds");
            break;
          default:
            errorMessage +=
              "Unknown error occurred. Please enter your address manually.";
            console.error("Unknown geolocation error");
        }

        toast.error(errorMessage, { duration: 5000 });
        setGettingLocation(false);
      },
      options,
    );
  };

  const handleApplyDiscount = async () => {
    if (process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT !== "true") {
      toast.error("Loyalty discounts are currently disabled");
      return;
    }

    if (!discountCode.trim()) {
      setDiscountError("Please enter a discount code");
      return;
    }

    setValidatingDiscount(true);
    setDiscountError("");

    try {
      const discount = await LoyaltyService.findLoyaltyDiscountByCode(
        discountCode.trim(),
      );

      if (!discount) {
        setDiscountError("Invalid discount code");
        setAppliedDiscount(null);
        return;
      }

      if (discount.code_status !== "active") {
        setDiscountError(
          "This discount code has already been used or is inactive",
        );
        setAppliedDiscount(null);
        return;
      }

      // Check if customer matches (optional, but good for security)
      // if (customer && discount.customer_id !== customer.$id) {
      //   setDiscountError("This discount code belongs to another customer");
      //   setAppliedDiscount(null);
      //   return;
      // }

      setAppliedDiscount(discount);
      toast.success("Discount code applied successfully!");
    } catch (error) {
      console.error("Error validating discount:", error);
      setDiscountError("Failed to validate discount code");
      setAppliedDiscount(null);
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError("");
    toast.success("Discount removed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.phone || !formData.addressLine) {
      toast.error("Please fill in all required fields");
      return;
    }

    const phoneValidation = validatePakistaniPhoneNumber(formData.phone);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.error!);
      return;
    }

    // Use the cleaned phone number from validation
    const cleanedPhone = phoneValidation.cleanedPhone || formData.phone;

    // Validate that no product has 0 price
    const zeroPriceProducts = items.filter(
      (item) => item.product.base_price_per_kg === 0,
    );
    if (zeroPriceProducts.length > 0) {
      const productNames = zeroPriceProducts
        .map((item) => item.product.name)
        .join(", ");
      toast.error(
        `Cannot place order: The following products have invalid pricing: ${productNames}. Please contact support or remove these items from your cart.`,
      );
      return;
    }

    // FAILSAFE: Ensure total price is positive
    const currentTotalPrice = getTotalPrice();
    if (currentTotalPrice <= 0) {
      toast.error(
        "Cannot place order with 0 total price. Please check your cart items.",
      );
      console.error("Attempted to place order with 0 total price", { items });
      return;
    }

    // Coordinates are now optional for manual checkout

    setLoading(true);

    try {
      // Use phone number as customer identifier
      // Format phone number first
      const formattedPhone = formatPhoneNumber(cleanedPhone);

      // ---------------------------------------------------------
      // AGENT ID LOGIC: Append (S) or (K) for specific agents
      // ---------------------------------------------------------
      let dbFullName = formData.fullName;
      if (user && user.labels) {
        // Case-insensitive check for agent labels
        const labels = user.labels.map((l) => l.toLowerCase());
        let suffix = "";

        if (labels.includes("saima")) {
          suffix = " (S)";
        } else if (labels.includes("kiran")) {
          suffix = " (K)";
        }

        // Append suffix if found and not already present (avoid duplicates)
        if (suffix) {
          // Check if name already ends with this suffix (ignoring case)
          const lowerName = dbFullName.toLowerCase();
          const lowerSuffix = suffix.toLowerCase();

          if (!lowerName.endsWith(lowerSuffix)) {
            // Also check if it ends with just the letter part e.g. " (s)" or " (S)"
            // to be safe, but generic check is safer.
            dbFullName = dbFullName + suffix;
          }
        }
      }
      // ---------------------------------------------------------

      // Check if a customer with this phone number already exists
      const existingCustomerByPhone = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: CUSTOMERS_TABLE_ID,
        queries: [Query.equal("phone", formattedPhone)],
      });

      let customerId: string;

      if (existingCustomerByPhone.rows.length > 0) {
        // Use existing customer with this phone number
        const existingCustomer = existingCustomerByPhone.rows[0];
        customerId = existingCustomer.$id;

        // Determine correct user_id to save
        // If user is logged in, they claim this record (or update it)
        // If user is guest, we MUST preserve the existing user_id if it's a real ID
        let userIdToSave = "guest";
        if (user?.$id) {
          userIdToSave = user.$id;
        } else {
          // Guest checkout: keep existing ID if it's not "guest"
          userIdToSave =
            existingCustomer.user_id && existingCustomer.user_id !== "guest"
              ? existingCustomer.user_id
              : "guest";
        }

        // Update customer info
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: CUSTOMERS_TABLE_ID,
          rowId: customerId,
          data: {
            user_id: userIdToSave,
            full_name: dbFullName,
            email: formData.email || null,
            phone: formattedPhone, // Ensure phone is formatted
          },
        });
      } else {
        // Create new customer with phone as the primary identifier
        customerId = ID.unique();
        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: CUSTOMERS_TABLE_ID,
          rowId: customerId,
          data: {
            user_id: user?.$id || "guest",
            full_name: dbFullName,
            phone: formattedPhone,
            email: formData.email || null,
          },
        });
      }

      // Create IDs upfront for atomic linking
      const orderId = ID.unique();
      const addressId = ID.unique();
      const mapsUrl = generateMapsUrl(formData.latitude, formData.longitude);
      const finalCity =
        formData.city === "Other City/Town"
          ? formData.otherCity
          : formData.city;

      const orderItems = formatOrderItems(
        items.map((item) => ({
          productId: item.product.$id,
          quantity: item.quantity,
        })),
      );

      // Calculate totals from items
      let totalItemsCount = 0;
      let totalWeightKg = 0;
      let subtotalBeforeDiscount = 0;
      let totalDiscountAmount = 0;
      let finalTotalPrice = 0;

      // Prepare item data with calculations
      const processedItems = items.map((item) => {
        const product = item.product;

        // Calculate tier pricing
        const tierPricing = calculateTierPricing(product, item.quantity);

        // Calculate item totals with loyalty discount if applicable
        // Disallow loyalty discount on Cold Drink bundles
        const loyaltyDiscountPercent =
          (appliedDiscount?.extra_discount_percentage || 0) *
          (item.isColdDrinkBundle ? 0 : 1);
        const itemCalculations = calculateItemTotal(
          tierPricing.pricePerKg,
          item.quantity,
          loyaltyDiscountPercent,
        );

        // Calculate total discount for this item (Tier Discount + Loyalty Discount)
        // Tier Discount = (Base Price - Tier Price) * Quantity
        // Loyalty Discount = itemCalculations.discountAmount
        // No tier discount for Cold Drink bundles
        const tierDiscountAmount = item.isColdDrinkBundle
          ? 0
          : tierPricing.discountAmount;
        const totalItemDiscount =
          tierDiscountAmount + itemCalculations.discountAmount;

        // Round values for Appwrite (requires integer)
        const roundedItemTotal = Math.round(itemCalculations.total);
        const roundedItemDiscount = Math.round(totalItemDiscount);
        const roundedSubtotal = Math.round(
          product.base_price_per_kg * item.quantity,
        );

        // Update order-level totals
        totalItemsCount += 1;
        totalWeightKg += item.quantity;
        subtotalBeforeDiscount += roundedSubtotal;
        totalDiscountAmount += roundedItemDiscount;
        finalTotalPrice += roundedItemTotal;

        return {
          item,
          product,
          tierPricing,
          itemCalculations,
          totalItemDiscount,
          // Pass rounded values for use in order item creation
          roundedItemTotal,
          roundedItemDiscount,
          roundedSubtotal,
        };
      });

      // KEY FIX: Create Order Items FIRST to prevent "Zero Price" orders
      // If this fails, no order is created. If order creation fails later, we have orphan items (better than ghost orders).
      const createdItemIds: string[] = [];

      try {
        for (const processed of processedItems) {
          const {
            item,
            product,
            tierPricing,
            itemCalculations,
            totalItemDiscount,
            roundedItemTotal,
            roundedItemDiscount,
            roundedSubtotal,
          } = processed;

          const itemId = ID.unique();
          await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: ORDER_ITEMS_TABLE_ID,
            rowId: itemId,
            data: {
              order_id: orderId,
              product_id: product.$id,
              product_name: product.name,
              product_description: product.description || "",

              // Quantity info
              quantity_kg: item.quantity,
              bags_3kg: item.bags?.kg3 || 0,
              bags_5kg: item.bags?.kg5 || 0,
              bags_10kg: item.bags?.kg10 || 0,
              bags_25kg: item.bags?.kg25 || 0,

              // Price info
              price_per_kg_at_order: tierPricing.pricePerKg, // Tier price (effective unit price)
              base_price_per_kg: product.base_price_per_kg, // Original base price

              // Tier info
              tier_applied: tierPricing.tierApplied,

              // Discount info
              discount_percentage:
                product.base_price_per_kg * item.quantity > 0
                  ? (totalItemDiscount /
                      (product.base_price_per_kg * item.quantity)) *
                    100
                  : 0,
              discount_amount: roundedItemDiscount, // Includes tier + loyalty discount (Rounded)

              // Totals
              subtotal_before_discount: roundedSubtotal, // Rounded
              total_after_discount: roundedItemTotal, // Rounded

              // Metadata
              notes:
                (formData.notes || "") +
                (item.isColdDrinkBundle && item.quantity >= 10
                  ? `\n(Free Cold Drink Deal Qualified)`
                  : ""),
            },
          });
          createdItemIds.push(itemId);
        }

        // Create address FIRST (using pre-generated orderId)
        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: ADDRESSES_TABLE_ID,
          rowId: addressId,
          data: {
            customer_id: customerId,
            order_id: orderId,
            address_line: formData.addressLine,
            city: finalCity,
            latitude: formData.latitude,
            longitude: formData.longitude,
            maps_url: mapsUrl,
          },
        });

        // Create order with accurate calculated totals AND the pre-generated address_id
        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: ORDERS_TABLE_ID,
          rowId: orderId,
          data: {
            customer_id: customerId,
            address_id: addressId, // Set immediately! No update needed.
            order_items: orderItems, // CSV string snapshot

            // Summary fields
            total_items_count: totalItemsCount,
            total_weight_kg: totalWeightKg,
            subtotal_before_discount: subtotalBeforeDiscount,
            total_discount_amount: totalDiscountAmount,
            total_price: finalTotalPrice,

            status: "pending",
          },
        });
      } catch (creationError) {
        console.error("Error during order creation flow:", creationError);

        // ROLLBACK: If order creation failed, clean up items and potentially address
        // Note: If address creation failed, the order creation isn't attempted, so we just clean items.
        // If order creation failed, we should technically clean up the address too to avoid orphans.

        // 1. Delete Items
        if (createdItemIds.length > 0) {
          console.log("Rolling back created items...");
          await Promise.allSettled(
            createdItemIds.map((id) =>
              tablesDB.deleteRow({
                databaseId: DATABASE_ID,
                tableId: ORDER_ITEMS_TABLE_ID,
                rowId: id,
              }),
            ),
          );
        }

        // 2. Delete Address (if it was created but order failed)
        // We can try to delete the addressId just in case. If it doesn't exist, it will just fail silently or throw (we catch).
        try {
          await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: ADDRESSES_TABLE_ID,
            rowId: addressId,
          });
          console.log("Rolled back address");
        } catch (ignored) {
          // Address might not have been created yet, or delete failed.
        }

        throw creationError; // Re-throw to be caught by main try-catch
      }

      // Track Purchase event (skip for agents)
      if (!isAgent) {
        const cleanedName =
          sanitizeCustomerNameForMeta(formData.fullName) || formData.fullName;

        trackPurchase({
          value: getTotalPrice(),
          currency: "PKR",
          orderId,
          numItems: items.reduce((sum, item) => sum + item.quantity, 0),
          contentIds: items.map((item) => item.product.$id),
          contents: items.map((item) => ({
            id: item.product.$id,
            quantity: item.quantity,
            item_price: item.product.base_price_per_kg,
          })),
          userData: {
            email: formData.email || undefined,
            phone: formattedPhone,
            firstName: cleanedName.split(" ")[0],
            lastName: cleanedName.split(" ").slice(1).join(" "),
            city: finalCity || undefined,
            externalId: !isAgent && user?.$id ? user.$id : customerId,
          },
          trackingContext: {
            orderChannel,
            agentLabel,
            placedByUserId: user?.$id,
            customerUserId: customerId,
          },
        }).catch((trackingError) => {
          console.error("[Meta Purchase] non-blocking send failed:", {
            orderId,
            trackingError,
          });
        });
      }

      // Mark discount code as used if applied
      if (appliedDiscount) {
        try {
          await LoyaltyService.validateAndUseDiscountCode(
            appliedDiscount.discount_code,
            orderId,
          );
        } catch (discountError) {
          console.error("Error marking discount as used:", discountError);
          // Don't fail the order, but log it for admin attention
        }
      }

      let loyaltyData = null;

      // Process loyalty discount (for NEXT order)
      try {
        const productNames = items.map((item) => item.product.name);

        // Use Server Action to ensure secure execution with API key
        loyaltyData = await processLoyaltyReward(
          customerId,
          formData.fullName,
          getTotalPrice(),
          productNames,
          orderId,
        );
      } catch (loyaltyError) {
        console.error("Error processing loyalty discount:", loyaltyError);
        // Don't block the flow if loyalty processing fails
      }

      // Send order confirmation email if email is provided (AFTER loyalty check)
      if (formData.email) {
        try {
          await fetch("/api/send-order-confirmation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId,
              customerName: formData.fullName,
              customerEmail: formData.email,
              customerPhone: formattedPhone,
              deliveryAddress: formData.addressLine,
              mapsUrl,
              items: items.map((item) => {
                const savingsInfo = calculateSavings(
                  item.product,
                  item.quantity,
                );
                return {
                  productName: item.product.name,
                  quantity: item.quantity,
                  price: savingsInfo.discountedPrice,
                  originalPrice: savingsInfo.originalPrice,
                  savings: savingsInfo.savings,
                  savingsPercentage: savingsInfo.savingsPercentage,
                  tierApplied: savingsInfo.tierApplied,
                  isColdDrinkBundle: item.isColdDrinkBundle,
                };
              }),
              totalPrice: getTotalPrice(),
              totalSavings,
              totalOriginalPrice,
              totalWeight: items.reduce((acc, item) => acc + item.quantity, 0),
              loyaltyCode: loyaltyData?.discount_code,
              loyaltyPercent: loyaltyData?.discount_percentage,
            }),
          });
          // Don't block order completion if email fails
          console.log(
            "Order confirmation email sent (with loyalty info if applicable)",
          );
        } catch (emailError) {
          console.error("Failed to send order confirmation email:", emailError);
          // Continue with order completion even if email fails
        }
      }

      toast.success("Order placed successfully!");

      // Set flag to prevent redirect to cart when items are cleared
      isOrderPlacedRef.current = true;

      clearCart();

      let successUrl = `/checkout/success?orderId=${orderId}`;
      if (loyaltyData) {
        successUrl += `&loyaltyCode=${loyaltyData.discount_code}&loyaltyPercent=${loyaltyData.discount_percentage}`;
      }

      router.push(successUrl);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = getTotalPrice();

  // Calculate total savings across all items
  const totalSavings = items.reduce((total, item) => {
    const savingsInfo = calculateSavings(item.product, item.quantity);
    return total + savingsInfo.savings;
  }, 0);

  const totalOriginalPrice = items.reduce((total, item) => {
    const savingsInfo = calculateSavings(item.product, item.quantity);
    return total + savingsInfo.originalPrice;
  }, 0);

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-[#27247b] mb-2">Checkout</h1>
          <p className="text-gray-600">
            Complete your order with cash on delivery
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="border-2 border-gray-200 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-linear-to-r from-[#27247b] to-[#27247b]/90 text-white p-6">
                <CardTitle className="text-2xl font-bold text-whiteflex items-center">
                  <span className="text-3xl mr-3">📋</span>
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-[#27247b] mb-2">
                        Full Name *
                      </label>
                      <Input
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        required
                        className="border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-[#27247b] mb-2">
                          Phone Number *
                        </label>
                        <Input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          required
                          className="border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base"
                          placeholder="03XX XXXXXXX"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-[#27247b] mb-2">
                          Email (Optional)
                        </label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <label className="block text-sm font-bold text-[#27247b] mb-2">
                          City *
                        </label>
                        <Select
                          value={formData.city}
                          onValueChange={(val) => {
                            setFormData({
                              ...formData,
                              city: val,
                              otherCity:
                                val !== "Other City/Town"
                                  ? ""
                                  : formData.otherCity,
                            });
                          }}
                        >
                          <SelectTrigger className="w-full border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base bg-gray-50 cursor-pointer">
                            <SelectValue placeholder="Select City" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Karachi">Karachi</SelectItem>
                            <SelectItem value="Other City/Town">
                              Other City (
                              <span className="font-semibold text-red-500">
                                Separate Courier Delivery Charges
                              </span>
                              )
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.city === "Other City/Town" && (
                        <div className="col-span-1">
                          <label className="block text-sm font-bold text-[#27247b] mb-2">
                            Enter Your City/Town *
                          </label>
                          <Input
                            value={formData.otherCity}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                otherCity: e.target.value,
                              })
                            }
                            required
                            className="border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base"
                            placeholder="e.g. Lahore, Islamabad"
                          />
                        </div>
                      )}

                      <div
                        className={`col-span-1 ${formData.city === "Other City/Town" ? "md:col-span-2" : "md:col-span-1"}`}
                      >
                        <label className="block text-sm font-bold text-[#27247b] mb-2">
                          Delivery Address *
                        </label>
                        <Input
                          value={formData.addressLine}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              addressLine: e.target.value,
                            })
                          }
                          required
                          className="border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base"
                          placeholder="House #, Street, Area"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#27247b] mb-2">
                        Order Notes (Optional)
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notes: e.target.value,
                          })
                        }
                        className="w-full border-2 border-gray-300 focus:border-[#ffff03] focus:ring-2 focus:ring-[#ffff03]/20 rounded-lg p-3 text-base min-h-25"
                        placeholder="Any special instructions for delivery..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="space-y-2">
                      <div className="bg-linear-to-br from-[#27247b]/5 to-[#27247b]/10 border-2 border-[#27247b]/20 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <label className="text-sm text-[#27247b] font-bold mb-2 block">
                              📍 For Fast & Accurate Delivery (Optional)
                            </label>
                            <ul className="text-xs text-[#27247b]/80 space-y-1 ml-4 list-disc">
                              <li>Turn on your phone's GPS/location</li>
                              <li className="text-[#27247b]/60 italic">
                                Recommended
                              </li>
                            </ul>
                          </div>
                          <Button
                            type="button"
                            onClick={handleGetLocation}
                            disabled={gettingLocation}
                            className="bg-linear-to-r from-[#ffff03] to-[#ffed00] hover:from-[#ffff03]/90 hover:to-[#ffed00]/90 text-[#27247b] font-bold py-3 px-5 rounded-xl border-2 border-[#27247b]/30 shadow-lg hover:shadow-2xl hover:scale-[1.05] active:scale-[0.95] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            <MapPin
                              className={`w-5 h-5 ${gettingLocation ? "animate-pulse" : ""}`}
                            />
                            <span className="hidden sm:inline">
                              {gettingLocation
                                ? "Please Wait…"
                                : "Enable Location"}
                            </span>
                            <span className="sm:hidden">
                              {gettingLocation ? "Getting..." : "GPS"}
                            </span>
                          </Button>
                        </div>
                      </div>

                      {/* Show location details only if actual coordinates are provided */}
                      {((formData.latitude !== 0 && formData.longitude !== 0) ||
                        (formData.latitude !== 0 && formData.longitude === 0) ||
                        (formData.latitude === 0 &&
                          formData.longitude !== 0)) && (
                        <div className="bg-[#ffff03]/20 border-2 border-[#ffff03] rounded-xl p-4">
                          <p className="text-sm font-bold text-[#27247b] mb-1">
                            ✓ Location Captured Successfully
                          </p>
                          <p className="text-xs text-[#27247b]/80">
                            Coordinates captured and ready for delivery
                          </p>
                          <a
                            href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#27247b] font-bold hover:underline mt-1 inline-block"
                          >
                            View on Google Maps
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="hidden text-xs font-bold text-[#27247b] mb-1">
                            Latitude
                          </label>
                          {/* Hidden latitude input - functionality preserved */}
                          <input
                            type="hidden"
                            step="any"
                            value={formData.latitude || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                latitude: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="hidden text-xs font-bold text-[#27247b] mb-1">
                            Longitude
                          </label>
                          {/* Hidden longitude input - functionality preserved */}
                          <input
                            type="hidden"
                            step="any"
                            value={formData.longitude || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                longitude: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-linear-to-r from-[#27247b] to-[#27247b]/90 hover:from-[#27247b]/90 hover:to-[#27247b] text-white font-bold py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 border-2 border-[#ffff03]"
                    disabled={loading}
                  >
                    {loading
                      ? "🚀 Placing Order. Please wait..."
                      : "🛒 Place Order (Cash on Delivery)"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* Discount Code Section */}
            {process.env.NEXT_PUBLIC_ENABLE_LOYALTY_DISCOUNT === "true" &&
              !items.some((item) => item.isColdDrinkBundle) && (
                <Card className="border-2 border-gray-200 shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="bg-linear-to-r from-[#27247b] to-[#27247b]/90 p-6">
                    <CardTitle className="text-xl font-bold text-white flex items-center">
                      <Gift className="w-5 h-5 mr-2 text-[#ffff03]" />
                      Discount Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {!appliedDiscount ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter code (e.g. LOYALTY...)"
                            value={discountCode}
                            onChange={(e) => {
                              setDiscountCode(e.target.value.toUpperCase());
                              setDiscountError("");
                            }}
                            className="uppercase"
                          />
                          <Button
                            type="button"
                            onClick={handleApplyDiscount}
                            disabled={validatingDiscount || !discountCode}
                            className="bg-[#ffff03] text-[#27247b] hover:bg-[#ffff03]/90 font-bold"
                          >
                            {validatingDiscount ? "..." : "Apply"}
                          </Button>
                        </div>
                        {discountError && (
                          <p className="text-red-500 text-sm flex items-center">
                            <X className="w-4 h-4 mr-1" />
                            {discountError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-green-800 font-bold flex items-center">
                              <Check className="w-4 h-4 mr-1" />
                              Code Applied!
                            </p>
                            <p className="text-sm text-green-600 font-mono mt-1">
                              {appliedDiscount.discount_code}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveDiscount}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-auto p-1"
                          >
                            Remove
                          </Button>
                        </div>
                        <p className="text-sm text-green-700">
                          {appliedDiscount.extra_discount_percentage}% Loyalty
                          Extra discount will be applied to your total.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            <Card className="sticky top-20 border-2 border-gray-200 shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-linear-to-r from-[#ffff03] to-[#ffff03]/90 p-6">
                <CardTitle className="text-2xl font-bold text-[#27247b] flex items-center">
                  <span className="text-3xl mr-3">🛒</span>
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {process.env.NEXT_PUBLIC_ENABLE_RAMADAN_OFFER === "true" &&
                  (() => {
                    const totalWeight = items.reduce(
                      (acc, item) => acc + item.quantity,
                      0,
                    );
                    const freeKg = Math.floor(totalWeight / 15);
                    const nextThreshold = (freeKg + 1) * 15;
                    const kgNeeded = nextThreshold - totalWeight;

                    return (
                      <div className="mb-6 p-4 rounded-xl border-2 border-[#ffff03] bg-linear-to-r from-[#27247b] to-[#27247b]/90 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <span className="text-6xl">🌙</span>
                        </div>
                        <div className="relative z-10">
                          <h3 className="font-bold text-[#ffff03] flex items-center gap-2 mb-1">
                            <span>⏳</span> Post-Eid Special (Ends April 25)
                          </h3>
                          {freeKg > 0 ? (
                            <p className="text-sm">
                              🎉{" "}
                              <span className="font-bold text-[#ffff03]">
                                {freeKg}kg FREE Rice
                              </span>{" "}
                              qualified! Add{" "}
                              <span className="font-bold text-[#ffff03]">
                                {kgNeeded}kg
                              </span>{" "}
                              more for {freeKg + 1}kg free.
                            </p>
                          ) : (
                            <p className="text-sm">
                              Add{" "}
                              <span className="font-bold text-[#ffff03]">
                                {kgNeeded}kg
                              </span>{" "}
                              more for 1kg FREE Rice!
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                <div className="space-y-3 mb-6">
                  {items.map((item) => {
                    const itemSavings = calculateSavings(
                      item.product,
                      item.quantity,
                    );
                    const imageUrl = item.product.primary_image_id
                      ? `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${item.product.primary_image_id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`
                      : null;
                    return (
                      <div
                        key={`${item.product.$id}-${item.isColdDrinkBundle ? "bundle" : "standard"}`}
                        className="flex gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="relative w-16 h-16 shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                              quality={70}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-2xl">🌾</div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#27247b] truncate">
                              {item.product.name}
                            </span>

                            {/* Bundle Deal Styling */}
                            {item.isColdDrinkBundle && (
                              <div className="mt-1 inline-flex items-center gap-1.5 bg-linear-to-r from-teal-50 to-cyan-50 border border-teal-200 px-2 py-1 rounded-md shadow-sm w-fit">
                                <span className="text-sm">🥤</span>
                                <div>
                                  <p className="text-[9px] font-bold text-teal-700 uppercase tracking-widest leading-none mb-0.5">
                                    Bundle Offer
                                  </p>
                                  <p className="text-[10px] text-teal-900 font-bold leading-none">
                                    {item.quantity >= 10
                                      ? Math.floor(item.quantity / 10)
                                      : 0}
                                    x Free 1L Cold Drink
                                  </p>
                                </div>
                              </div>
                            )}

                            {itemSavings.savings > 0 &&
                              !item.isColdDrinkBundle && (
                                <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full w-fit mt-1">
                                  {itemSavings.savingsPercentage.toFixed(0)}%
                                  OFF
                                </span>
                              )}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#27247b] self-center">
                          {item.quantity}kg
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t-2 border-gray-200 pt-4">
                  {totalSavings > 0 && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-600">Original Total:</span>
                        <span className="text-gray-500 line-through">
                          {formatCurrency(totalOriginalPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-green-700 font-semibold">
                          You Save:
                        </span>
                        <span className="text-green-700 font-bold">
                          -{formatCurrency(totalSavings)} (
                          {((totalSavings / totalOriginalPrice) * 100).toFixed(
                            0,
                          )}
                          % off)
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-[#27247b]">
                      Subtotal
                    </span>
                    <span className="font-bold text-[#27247b]">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-[#27247b]">
                      Delivery
                    </span>
                    <span className="text-[#ffff03] font-bold bg-[#27247b] px-3 py-1 rounded-full text-sm">
                      FREE
                    </span>
                  </div>
                  <div className="border-t-2 border-[#ffff03] pt-4 bg-[#ffff03]/10 -mx-6 px-6 py-4">
                    {appliedDiscount && (
                      <div className="flex justify-between items-center mb-2 text-green-700">
                        <span className="font-semibold">
                          Loyalty Discount (
                          {appliedDiscount.extra_discount_percentage}%)
                        </span>
                        <span className="font-bold">
                          -
                          {formatCurrency(
                            items.reduce((acc, item) => {
                              if (item.isColdDrinkBundle) return acc;
                              return (
                                acc +
                                (calculatePrice(item.product, item.quantity) *
                                  appliedDiscount.extra_discount_percentage) /
                                  100
                              );
                            }, 0),
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-[#27247b]">
                        Total
                      </span>
                      <span className="text-3xl font-bold text-[#27247b]">
                        {formatCurrency(
                          appliedDiscount
                            ? totalPrice -
                                items.reduce((acc, item) => {
                                  if (item.isColdDrinkBundle) return acc;
                                  return (
                                    acc +
                                    (calculatePrice(
                                      item.product,
                                      item.quantity,
                                    ) *
                                      appliedDiscount.extra_discount_percentage) /
                                      100
                                  );
                                }, 0)
                            : totalPrice,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-[#27247b] rounded-xl">
                  <p className="text-sm text-white font-bold flex items-center">
                    <span className="text-xl mr-2">💰</span>
                    Cash on Delivery
                  </p>
                  <p className="text-xs text-white/90 mt-1">
                    Pay when you receive your order
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
