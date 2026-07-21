import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  calculatePrice,
  formatCurrency,
  formatPhoneNumberForDisplay,
  getPricePerKg,
  validatePakistaniPhoneNumber,
} from "@repo/utils";

import { AppButton } from "@/components/app-button";
import { Image } from "@/components/app-image";
import { CheckoutSuccessModal } from "@/components/checkout-success-modal";
import { OrderDetailsModal } from "@/components/order-details-modal";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { successFeedback, warningFeedback } from "@/lib/native-feedback";
import {
  requestMobileAdTrackingPermission,
  trackMobileInitiateCheckout,
  trackMobilePurchase,
} from "@/lib/meta-events";
import {
  loadSavedCheckoutDetails,
  placeCodOrder,
  type PlaceOrderResult,
} from "@/lib/orders";

type BagSize = 3 | 5 | 10 | 25;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CartScreen() {
  const router = useRouter();
  const {
    clearCart,
    getTotalItems,
    getTotalPrice,
    items,
    removeBag,
    addBag,
    removeItem,
  } = useCart();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loadingSavedDetails, setLoadingSavedDetails] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<PlaceOrderResult | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const trackedCheckoutKey = useRef<string | null>(null);
  const [formData, setFormData] = useState({
    addressLine: "",
    city: "Karachi",
    email: "",
    fullName: "",
    latitude: 0,
    longitude: 0,
    notes: "",
    phone: "",
  });

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    setLoadingSavedDetails(true);
    loadSavedCheckoutDetails(user.$id)
      .then(({ address, customer }) => {
        if (cancelled) return;
        setFormData((current) => ({
          ...current,
          addressLine: current.addressLine || address?.address_line || "",
          city: current.city || address?.city || "Karachi",
          email: current.email || customer?.email || user.email || "",
          fullName: current.fullName || customer?.full_name || user.name || "",
          latitude: current.latitude || address?.latitude || 0,
          longitude: current.longitude || address?.longitude || 0,
          phone:
            current.phone ||
            formatPhoneNumberForDisplay(customer?.phone || user.phone || ""),
        }));
      })
      .catch(() => {
        if (!cancelled)
          setFormData((current) => ({
            ...current,
            email: current.email || user.email || "",
            fullName: current.fullName || user.name || "",
            phone:
              current.phone || formatPhoneNumberForDisplay(user.phone || ""),
          }));
      })
      .finally(() => {
        if (!cancelled) setLoadingSavedDetails(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (items.length === 0) {
      trackedCheckoutKey.current = null;
      return;
    }
    const checkoutKey = items
      .map(
        (item) =>
          `${item.product.$id}:${item.quantity}:${item.isColdDrinkBundle ? "bundle" : "regular"}`,
      )
      .join("|");
    if (trackedCheckoutKey.current === checkoutKey) return;
    trackedCheckoutKey.current = checkoutKey;
    void trackMobileInitiateCheckout({
      value: getTotalPrice(),
      numItems: getTotalItems(),
      contentIds: items.map((item) => item.product.$id),
    });
  }, [getTotalItems, getTotalPrice, items]);

  const setField = (field: keyof typeof formData, value: string | number) =>
    setFormData((current) => ({ ...current, [field]: value }));

  const handleGetLocation = async () => {
    setGettingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          "Location permission needed",
          "Please allow location access or continue with your manual address.",
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setFormData((current) => ({
        ...current,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }));
      Alert.alert(
        "Location captured",
        `Accuracy: ${Math.round(position.coords.accuracy ?? 0)}m`,
      );
      await successFeedback();
    } catch (error) {
      Alert.alert(
        "Location unavailable",
        error instanceof Error
          ? error.message
          : "Could not capture your current location.",
      );
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    const fullName = formData.fullName.trim();
    const phone = formData.phone.trim();
    const addressLine = formData.addressLine.trim();
    const city = formData.city.trim();
    const email = formData.email.trim();
    if (items.length === 0) {
      void warningFeedback();
      Alert.alert(
        "Cart is empty",
        "Please add at least one rice bag before checkout.",
      );
      return;
    }
    if (!fullName || !phone || !addressLine || !city) {
      Alert.alert(
        "Missing details",
        "Please fill in name, phone, city, and address.",
      );
      return;
    }
    const phoneValidation = validatePakistaniPhoneNumber(phone);
    if (!phoneValidation.isValid) {
      Alert.alert("Invalid phone number", phoneValidation.error);
      return;
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid email address or leave it blank.",
      );
      return;
    }
    if (getTotalPrice() <= 0) {
      Alert.alert("Invalid cart", "Cannot place an order with a zero total.");
      return;
    }

    // The order is never blocked by this choice. If the user declines ATT,
    // checkout continues and no Meta tracking or hashed phone is transmitted.
    await requestMobileAdTrackingPermission();

    setSubmitting(true);
    try {
      const result = await placeCodOrder(
        {
          ...formData,
          phone: phoneValidation.cleanedPhone ?? phone,
          userId: user?.$id,
        },
        items,
      );
      const purchasedItems = [...items];
      const purchasedItemCount = getTotalItems();
      clearCart();
      setFormData({
        addressLine: "",
        city: "Karachi",
        email: "",
        fullName: "",
        latitude: 0,
        longitude: 0,
        notes: "",
        phone: "",
      });
      await successFeedback();
      void trackMobilePurchase({
        orderId: result.orderId,
        value: result.totalPrice,
        numItems: purchasedItemCount,
        contentIds: purchasedItems.map((item) => item.product.$id),
        contents: purchasedItems.map((item) => ({
          id: item.product.$id,
          quantity: item.quantity,
          item_price: calculatePrice(item.product, item.quantity),
        })),
        phone,
      });
      setPlacedOrder(result);
    } catch (error) {
      void warningFeedback();
      Alert.alert(
        "Could not place order",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <CheckoutSuccessModal
        onClose={() => {
          setPlacedOrder(null);
          router.push("/");
        }}
        onViewOrder={(orderId) => {
          setPlacedOrder(null);
          setSelectedOrderId(orderId);
        }}
        result={placedOrder}
      />
      <OrderDetailsModal
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView keyboardShouldPersistTaps="handled" className="flex-1">
          <View className="gap-5 px-4 pb-6 pt-4">
            <View className="gap-2">
              <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-muted">
                Checkout
              </Text>
              <Text className="text-[30px] font-extrabold leading-[35px] text-brand-800">
                Your rice bag
              </Text>
              <Text className="text-[15px] leading-[22px] text-body">
                {items.length > 0
                  ? `${getTotalItems()} bags selected for Cash on Delivery.`
                  : "Add products from Home to start your order."}
              </Text>
            </View>
            {items.length === 0 ? (
              <View className="gap-3 rounded-card border border-line bg-white p-5">
                <Text className="text-[21px] font-extrabold text-ink">
                  Your cart is empty
                </Text>
                <Text className="text-[14px] leading-5 text-body">
                  Select bag sizes from any product card and they will appear
                  here immediately.
                </Text>
                <AppButton variant="outline" onPress={() => router.push("/")}>
                  Browse rice
                </AppButton>
              </View>
            ) : (
              <View className="gap-3">
                {items.map((item) => {
                  const imageUrl =
                    "imageUrl" in item.product &&
                    typeof item.product.imageUrl === "string"
                      ? item.product.imageUrl
                      : undefined;
                  const itemTotal = calculatePrice(item.product, item.quantity);
                  const itemKey = `${item.product.$id}:${item.isColdDrinkBundle ? "bundle" : "regular"}`;
                  return (
                    <View
                      key={itemKey}
                      className="gap-3 rounded-card border border-line bg-white p-3"
                    >
                      <View className="flex-row gap-3">
                        {imageUrl ? (
                          <Image
                            source={{ uri: imageUrl }}
                            contentFit="cover"
                            className="h-[88px] w-[88px] rounded-[14px] bg-wash"
                          />
                        ) : (
                          <View className="h-[88px] w-[88px] items-center justify-center rounded-xl bg-gold-50">
                            <Text className="text-[20px] font-extrabold text-brand-800">
                              YR
                            </Text>
                          </View>
                        )}
                        <View className="flex-1 gap-1">
                          <Text className="text-[17px] font-extrabold text-brand-800">
                            {item.product.name}
                          </Text>
                          {item.isColdDrinkBundle && (
                            <Text className="self-start rounded-full bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700">
                              Free cold drink bundle
                            </Text>
                          )}
                          <Text className="text-[13px] font-semibold text-muted">
                            {item.quantity}kg at{" "}
                            {formatCurrency(
                              getPricePerKg(item.product, item.quantity),
                            )}
                            /kg
                          </Text>
                          <Text className="mt-1 text-[20px] font-extrabold text-brand-800">
                            {formatCurrency(itemTotal)}
                          </Text>
                        </View>
                      </View>
                      <View className="gap-2">
                        {(
                          [
                            [3, item.bags.kg3],
                            [5, item.bags.kg5],
                            [10, item.bags.kg10],
                            [25, item.bags.kg25],
                          ] as Array<[BagSize, number]>
                        )
                          .filter(([, count]) => count > 0)
                          .map(([size, count]) => (
                            <View
                              key={size}
                              className="flex-row items-center justify-between rounded-xl border border-line bg-canvas p-2.5"
                            >
                              <Text className="text-[14px] font-extrabold text-brand-800">
                                {size}kg bag
                              </Text>
                              <View className="flex-row items-center gap-2">
                                <Pressable
                                  onPress={() =>
                                    removeBag(
                                      item.product.$id,
                                      size,
                                      item.isColdDrinkBundle,
                                    )
                                  }
                                  className="h-9 w-9 items-center justify-center rounded-full border border-line bg-white active:bg-brand-50"
                                >
                                  <Text className="text-[18px] font-bold text-brand-800">
                                    −
                                  </Text>
                                </Pressable>
                                <Text className="min-w-5 text-center text-[15px] font-extrabold text-ink">
                                  {count}
                                </Text>
                                <Pressable
                                  onPress={() =>
                                    addBag(
                                      item.product,
                                      size,
                                      item.isColdDrinkBundle,
                                    )
                                  }
                                  className="h-9 w-9 items-center justify-center rounded-full bg-brand-800 active:bg-brand-900"
                                >
                                  <Text className="text-[18px] font-bold text-white">
                                    +
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}
                      </View>
                      <Pressable
                        onPress={() =>
                          removeItem(item.product.$id, item.isColdDrinkBundle)
                        }
                        className="self-start py-1"
                      >
                        <Text className="text-[12px] font-bold text-muted">
                          Remove item
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
            <View className="flex-row items-center justify-between rounded-card bg-brand-800 p-4">
              <Text className="text-[15px] font-bold text-brand-100">
                Order total
              </Text>
              <Text className="text-[25px] font-extrabold text-white">
                {formatCurrency(getTotalPrice())}
              </Text>
            </View>
            <View className="gap-4 rounded-card border border-line bg-white p-4">
              <View>
                <Text className="text-[20px] font-extrabold text-brand-800">
                  Delivery details
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-muted">
                  We use this information to confirm your COD order and find
                  your home.
                </Text>
              </View>
              {loadingSavedDetails && (
                <Text className="text-[12px] font-semibold text-muted">
                  Loading your saved details…
                </Text>
              )}
              <Field
                autoCapitalize="words"
                label="Full name"
                onChangeText={(value) => setField("fullName", value)}
                placeholder="Muhammad Wahaj"
                value={formData.fullName}
              />
              <Field
                keyboardType="phone-pad"
                label="Phone"
                onChangeText={(value) => setField("phone", value)}
                placeholder="03001234567"
                value={formData.phone}
              />
              <Field
                autoCapitalize="none"
                keyboardType="email-address"
                label="Email optional"
                onChangeText={(value) => setField("email", value)}
                placeholder="you@example.com"
                value={formData.email}
              />
              <Field
                autoCapitalize="words"
                label="City"
                onChangeText={(value) => setField("city", value)}
                placeholder="Karachi"
                value={formData.city}
              />
              <Field
                label="Address"
                multiline
                onChangeText={(value) => setField("addressLine", value)}
                placeholder="House, street, area, nearest landmark"
                value={formData.addressLine}
              />
              <Field
                label="Order notes optional"
                multiline
                onChangeText={(value) => setField("notes", value)}
                placeholder="Delivery timing or rider instructions"
                value={formData.notes}
              />
              <View className="flex-row items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                <View className="flex-1">
                  <Text className="text-[15px] font-extrabold text-brand-800">
                    Use your live location
                  </Text>
                  <Text className="mt-1 text-[12px] leading-4 text-brand-700">
                    {formData.latitude && formData.longitude
                      ? `${formData.latitude.toFixed(5)}, ${formData.longitude.toFixed(5)}`
                      : "Optional, but it helps delivery accuracy."}
                  </Text>
                </View>
                <AppButton
                  disabled={gettingLocation}
                  size="sm"
                  variant="outline"
                  onPress={handleGetLocation}
                >
                  {gettingLocation ? "Getting…" : "Use GPS"}
                </AppButton>
              </View>
            </View>
            <View className="gap-2">
              <AppButton
                disabled={items.length === 0 || submitting}
                size="lg"
                onPress={handleSubmit}
              >
                {submitting ? "Placing order…" : "Place COD order"}
              </AppButton>
              <Text className="text-center text-[11px] leading-4 text-muted">
                Secure checkout · Cash on Delivery · Free Karachi delivery
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  ...props
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad";
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[12px] font-bold text-body">{label}</Text>
      <TextInput
        {...props}
        autoCorrect={false}
        placeholderTextColor="#A3A5B5"
        className={`rounded-xl border border-line bg-canvas px-3.5 py-3 text-[15px] text-ink ${props.multiline ? "min-h-[84px]" : ""}`}
      />
    </View>
  );
}
