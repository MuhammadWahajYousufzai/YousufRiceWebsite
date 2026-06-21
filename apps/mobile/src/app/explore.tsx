import { Image } from "expo-image";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { Button } from "@repo/ui";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { CheckoutSuccessModal } from "@/components/checkout-success-modal";
import { OrderDetailsModal } from "@/components/order-details-modal";
import { successFeedback, warningFeedback } from "@/lib/native-feedback";
import {
  loadSavedCheckoutDetails,
  placeCodOrder,
  type PlaceOrderResult,
} from "@/lib/orders";

type BagSize = 3 | 5 | 10 | 25;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CartScreen() {
  const router = useRouter();
  const { clearCart, getTotalItems, getTotalPrice, items, removeBag, addBag, removeItem } = useCart();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loadingSavedDetails, setLoadingSavedDetails] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<PlaceOrderResult | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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
        if (cancelled) return;
        setFormData((current) => ({
          ...current,
          email: current.email || user.email || "",
          fullName: current.fullName || user.name || "",
          phone: current.phone || formatPhoneNumberForDisplay(user.phone || ""),
        }));
      })
      .finally(() => {
        if (!cancelled) setLoadingSavedDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const setField = (field: keyof typeof formData, value: string | number) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert("Location permission needed", "Please allow location access or continue with your manual address.");
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

      Alert.alert("Location captured", `Accuracy: ${Math.round(position.coords.accuracy ?? 0)}m`);
      await successFeedback();
    } catch (error) {
      Alert.alert(
        "Location unavailable",
        error instanceof Error ? error.message : "Could not capture your current location.",
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
      Alert.alert("Cart is empty", "Please add at least one rice bag before checkout.");
      return;
    }

    if (!fullName || !phone || !addressLine || !city) {
      Alert.alert("Missing details", "Please fill in name, phone, city, and address.");
      return;
    }

    const phoneValidation = validatePakistaniPhoneNumber(phone);
    if (!phoneValidation.isValid) {
      Alert.alert("Invalid phone number", phoneValidation.error);
      return;
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address or leave it blank.");
      return;
    }

    if (getTotalPrice() <= 0) {
      Alert.alert("Invalid cart", "Cannot place an order with a zero total.");
      return;
    }

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
    <SafeAreaView style={styles.safeArea}>
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
      <OrderDetailsModal onClose={() => setSelectedOrderId(null)} orderId={selectedOrderId} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Checkout</Text>
            <Text style={styles.title}>Your rice bag</Text>
            <Text style={styles.subtitle}>
              {items.length > 0
                ? `${getTotalItems()} bags selected for Cash on Delivery.`
                : "Add products from Home to start your order."}
            </Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptyText}>Select bag sizes from any product card and they will appear here immediately.</Text>
              <Button variant="outline" onPress={() => router.push("/")}>Browse Rice</Button>
            </View>
          ) : (
            <View style={styles.cartList}>
              {items.map((item) => {
                const imageUrl =
                  "imageUrl" in item.product && typeof item.product.imageUrl === "string"
                    ? item.product.imageUrl
                    : undefined;
                const itemTotal = calculatePrice(item.product, item.quantity);
                const itemKey = `${item.product.$id}:${item.isColdDrinkBundle ? "bundle" : "regular"}`;

                return (
                  <View key={itemKey} style={styles.cartCard}>
                    <View style={styles.cartTop}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.cartImage} contentFit="cover" />
                      ) : (
                        <View style={styles.cartFallback}>
                          <Text style={styles.cartFallbackText}>YR</Text>
                        </View>
                      )}
                      <View style={styles.cartInfo}>
                        <Text style={styles.cartName}>{item.product.name}</Text>
                        {!!item.isColdDrinkBundle && (
                          <Text style={styles.bundleLine}>Free cold drink bundle</Text>
                        )}
                        <Text style={styles.cartMeta}>
                          {item.quantity}kg at {formatCurrency(getPricePerKg(item.product, item.quantity))}/kg
                        </Text>
                        <Text style={styles.cartTotal}>{formatCurrency(itemTotal)}</Text>
                      </View>
                    </View>

                    <View style={styles.bagControls}>
                      {([
                        [3, item.bags.kg3],
                        [5, item.bags.kg5],
                        [10, item.bags.kg10],
                        [25, item.bags.kg25],
                      ] as Array<[BagSize, number]>)
                        .filter(([, count]) => count > 0)
                        .map(([size, count]) => (
                          <View key={size} style={styles.bagControl}>
                            <Text style={styles.bagControlLabel}>{size}kg</Text>
                            <View style={styles.stepper}>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => removeBag(item.product.$id, size, item.isColdDrinkBundle)}
                                style={styles.stepperButton}
                              >
                                <Text style={styles.stepperMinus}>-</Text>
                              </Pressable>
                              <Text style={styles.stepperValue}>{count}</Text>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => addBag(item.product, size, item.isColdDrinkBundle)}
                                style={styles.stepperButtonAdd}
                              >
                                <Text style={styles.stepperPlus}>+</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}
                    </View>

                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => removeItem(item.product.$id, item.isColdDrinkBundle)}
                    >
                      Remove item
                    </Button>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(getTotalPrice())}</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Delivery Details</Text>
            {loadingSavedDetails && (
              <Text style={styles.savedDetailsText}>Loading your saved delivery details…</Text>
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

            <View style={styles.locationCard}>
              <View>
                <Text style={styles.locationTitle}>Location</Text>
                <Text style={styles.locationText}>
                  {formData.latitude && formData.longitude
                    ? `${formData.latitude.toFixed(5)}, ${formData.longitude.toFixed(5)}`
                    : "Optional, but helps delivery accuracy."}
                </Text>
              </View>
              <Button
                disabled={gettingLocation}
                size="sm"
                variant="outline"
                onPress={handleGetLocation}
              >
                {gettingLocation ? "Getting..." : "Use GPS"}
              </Button>
            </View>
          </View>

          <Button disabled={items.length === 0 || submitting} size="lg" onPress={handleSubmit}>
            {submitting ? "Placing Order..." : "Place COD Order"}
          </Button>
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
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#94a3b8"
        style={[styles.input, props.multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const brandBlue = "#27247b";
const brandYellow = "#ffff03";

const styles = StyleSheet.create({
  bagControl: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  bagControlLabel: {
    color: brandBlue,
    fontSize: 14,
    fontWeight: "900",
  },
  bagControls: {
    gap: 8,
  },
  bundleLine: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cartCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  cartFallback: {
    alignItems: "center",
    backgroundColor: "#fefce8",
    borderRadius: 8,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  cartFallbackText: {
    color: brandBlue,
    fontSize: 20,
    fontWeight: "900",
  },
  cartImage: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    height: 88,
    width: 88,
  },
  cartInfo: {
    flex: 1,
    gap: 4,
  },
  cartList: {
    gap: 12,
  },
  cartMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  cartName: {
    color: brandBlue,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  cartTop: {
    flexDirection: "row",
    gap: 12,
  },
  cartTotal: {
    color: "#047857",
    fontSize: 17,
    fontWeight: "900",
  },
  container: {
    gap: 18,
    padding: 16,
    paddingBottom: 120,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  eyebrow: {
    color: "#047857",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
    padding: 14,
  },
  formTitle: {
    color: brandBlue,
    fontSize: 19,
    fontWeight: "900",
  },
  header: {
    gap: 6,
    paddingTop: 12,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  keyboardView: {
    flex: 1,
  },
  locationCard: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  locationText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
    maxWidth: 185,
  },
  locationTitle: {
    color: brandBlue,
    fontSize: 14,
    fontWeight: "900",
  },
  safeArea: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  savedDetailsText: {
    color: "#7B7D8F",
    fontSize: 12,
    fontWeight: "700",
  },
  stepper: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  stepperButton: {
    alignItems: "center",
    borderColor: "#d1d5db",
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  stepperButtonAdd: {
    alignItems: "center",
    backgroundColor: brandYellow,
    borderColor: brandYellow,
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  stepperMinus: {
    color: "#dc2626",
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 23,
  },
  stepperPlus: {
    color: brandBlue,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 22,
  },
  stepperValue: {
    color: brandBlue,
    fontSize: 15,
    fontWeight: "900",
    minWidth: 18,
    textAlign: "center",
  },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  title: {
    color: brandBlue,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 39,
  },
  totalCard: {
    alignItems: "center",
    backgroundColor: brandBlue,
    borderColor: brandYellow,
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  totalLabel: {
    color: "#c7d2fe",
    fontSize: 14,
    fontWeight: "900",
  },
  totalValue: {
    color: brandYellow,
    fontSize: 25,
    fontWeight: "900",
  },
});
