import type { Customer, Order } from "@repo/types";
import { formatCurrency, formatPhoneNumberForDisplay } from "@repo/utils";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/app-button";
import { OrderDetailsModal } from "@/components/order-details-modal";
import {
  CUSTOMERS_TABLE_ID,
  DATABASE_ID,
  ORDERS_TABLE_ID,
  Query,
  tablesDB,
} from "@/lib/appwrite";
import { useAuth } from "@/lib/auth";
import { registerMobilePushTarget } from "@/lib/mobile-notifications";
import { successFeedback, warningFeedback } from "@/lib/native-feedback";
import { findOrdersByPhone } from "@/lib/orders";

type AuthMode = "signIn" | "register" | "forgot";
interface RowList<T> {
  rows?: T[];
  documents?: T[];
}
const rowsFromResponse = <T,>(response: RowList<T>) =>
  response.rows ?? response.documents ?? [];
const canLoadOrders = () =>
  Boolean(DATABASE_ID && CUSTOMERS_TABLE_ID && ORDERS_TABLE_ID);

function orderStatusLabel(status: Order["status"]) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    case "returned":
      return "Returned";
    default:
      return "Pending";
  }
}

export default function AccountScreen() {
  const {
    error,
    isAuthenticated,
    loading,
    refreshUser,
    register,
    requestPasswordReset,
    signIn,
    signOut,
    user,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [registeringPush, setRegisteringPush] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [trackPhone, setTrackPhone] = useState("");
  const [trackedCustomer, setTrackedCustomer] = useState<Customer | null>(null);
  const [trackedOrders, setTrackedOrders] = useState<Order[]>([]);
  const [tracking, setTracking] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
  });

  const setField = (field: keyof typeof formData, value: string) =>
    setFormData((current) => ({ ...current, [field]: value }));
  const loadOrders = useCallback(async () => {
    if (!user || !canLoadOrders()) {
      setCustomer(null);
      setOrders([]);
      return;
    }
    setOrdersError(null);
    try {
      const customersResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: CUSTOMERS_TABLE_ID,
        queries: [Query.equal("user_id", user.$id), Query.limit(1)],
      });
      const currentCustomer = rowsFromResponse<Customer>(
        customersResponse as unknown as RowList<Customer>,
      )[0];
      if (!currentCustomer) {
        setCustomer(null);
        setOrders([]);
        return;
      }
      const ordersResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: ORDERS_TABLE_ID,
        queries: [
          Query.equal("customer_id", currentCustomer.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(10),
        ],
      });
      setCustomer(currentCustomer);
      setOrders(
        rowsFromResponse<Order>(ordersResponse as unknown as RowList<Order>),
      );
    } catch (caughtError) {
      setOrdersError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load your order history.",
      );
    }
  }, [user]);
  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrders();
    } finally {
      setRefreshing(false);
    }
  };
  const handleSubmit = async () => {
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;
    const name = formData.name.trim();
    if (
      !email ||
      (mode !== "forgot" && !password) ||
      (mode === "register" && !name)
    ) {
      Alert.alert(
        "Missing details",
        "Please fill in the required account fields.",
      );
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "forgot") {
        await requestPasswordReset(email);
        await successFeedback();
        Alert.alert(
          "Check your email",
          "We sent a secure password reset link.",
        );
        setMode("signIn");
      } else if (mode === "register") await register({ email, name, password });
      else await signIn({ email, password });
      setFormData({ email: "", name: "", password: "" });
      await loadOrders();
    } catch (caughtError) {
      Alert.alert(
        mode === "register" ? "Could not create account" : "Could not sign in",
        caughtError instanceof Error
          ? caughtError.message
          : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const handleTrackOrders = async () => {
    if (!trackPhone.trim()) {
      Alert.alert("Phone required", "Enter the phone number used at checkout.");
      return;
    }
    setTracking(true);
    try {
      const result = await findOrdersByPhone(trackPhone);
      setTrackedCustomer(result.customer);
      setTrackedOrders(result.orders);
      if (result.orders.length === 0) {
        void warningFeedback();
        Alert.alert("No orders found", "Check the phone number and try again.");
      } else await successFeedback();
    } catch (caughtError) {
      Alert.alert(
        "Could not track orders",
        caughtError instanceof Error
          ? caughtError.message
          : "Please try again.",
      );
    } finally {
      setTracking(false);
    }
  };
  const handleSignOut = async () => {
    await signOut();
    setCustomer(null);
    setOrders([]);
    setPushStatus(null);
  };
  const handleRegisterPush = async () => {
    setRegisteringPush(true);
    setPushStatus(null);
    try {
      const target = await registerMobilePushTarget();
      await refreshUser();
      setPushStatus(
        `Notifications enabled for this ${target.platform} device.`,
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Could not enable notifications.";
      setPushStatus(message);
      Alert.alert("Notifications unavailable", message);
    } finally {
      setRegisteringPush(false);
    }
  };

  if (!isAuthenticated)
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
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
                  Yousuf Rice account
                </Text>
                <Text className="text-[30px] font-extrabold leading-[35px] text-brand-800">
                  Order faster next time
                </Text>
                <Text className="text-[15px] leading-[22px] text-body">
                  Save your customer profile, connect orders to your phone, and
                  keep delivery history in one place.
                </Text>
              </View>
              <NotificationCard
                pushStatus={pushStatus}
                registeringPush={registeringPush}
                onPress={handleRegisterPush}
                guest
              />
              <View className="gap-4 rounded-card border border-line bg-white p-4">
                <Text className="text-[20px] font-extrabold text-brand-800">
                  Track a guest order
                </Text>
                <Text className="text-[13px] leading-5 text-muted">
                  Use the same phone number entered during checkout. No account
                  is required.
                </Text>
                <Field
                  keyboardType="phone-pad"
                  label="Checkout phone"
                  onChangeText={setTrackPhone}
                  placeholder="03001234567"
                  value={trackPhone}
                />
                <AppButton disabled={tracking} onPress={handleTrackOrders}>
                  {tracking ? "Searching…" : "Find my orders"}
                </AppButton>
                {trackedCustomer && (
                  <Text className="text-[13px] font-bold text-brand-700">
                    Orders for {trackedCustomer.full_name}
                  </Text>
                )}
                {trackedOrders.map((order) => (
                  <OrderSummary
                    key={order.$id}
                    onPress={() => setSelectedOrderId(order.$id)}
                    order={order}
                  />
                ))}
              </View>
              <View className="flex-row rounded-xl border border-line bg-white p-1">
                <Pressable
                  onPress={() => setMode("signIn")}
                  className={`flex-1 rounded-lg px-3 py-3 ${mode === "signIn" ? "bg-brand-800" : ""}`}
                >
                  <Text
                    className={`text-center text-[13px] font-bold ${mode === "signIn" ? "text-white" : "text-muted"}`}
                  >
                    Sign in
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode("register")}
                  className={`flex-1 rounded-lg px-3 py-3 ${mode === "register" ? "bg-brand-800" : ""}`}
                >
                  <Text
                    className={`text-center text-[13px] font-bold ${mode === "register" ? "text-white" : "text-muted"}`}
                  >
                    Create account
                  </Text>
                </Pressable>
              </View>
              <View className="gap-4 rounded-card border border-line bg-white p-4">
                {mode === "register" && (
                  <Field
                    autoCapitalize="words"
                    label="Full name"
                    onChangeText={(value) => setField("name", value)}
                    placeholder="Muhammad Wahaj"
                    value={formData.name}
                  />
                )}
                <Field
                  autoCapitalize="none"
                  keyboardType="email-address"
                  label="Email"
                  onChangeText={(value) => setField("email", value)}
                  placeholder="you@example.com"
                  value={formData.email}
                />
                {mode !== "forgot" && (
                  <Field
                    label="Password"
                    onChangeText={(value) => setField("password", value)}
                    placeholder="Minimum 8 characters"
                    secureTextEntry
                    value={formData.password}
                  />
                )}
                {mode === "signIn" && (
                  <Pressable onPress={() => setMode("forgot")}>
                    <Text className="text-[13px] font-bold text-brand-700">
                      Forgot your password?
                    </Text>
                  </Pressable>
                )}
                {mode === "forgot" && (
                  <View className="gap-2 rounded-xl bg-brand-50 p-3">
                    <Text className="text-[13px] leading-5 text-brand-700">
                      We will email a secure reset link to your account address.
                    </Text>
                    <Pressable onPress={() => setMode("signIn")}>
                      <Text className="text-[13px] font-bold text-brand-700">
                        Back to sign in
                      </Text>
                    </Pressable>
                  </View>
                )}
                {error && (
                  <Text className="text-[13px] font-bold leading-5 text-coral-700">
                    {error}
                  </Text>
                )}
                <AppButton
                  disabled={loading || submitting}
                  size="lg"
                  onPress={handleSubmit}
                >
                  {submitting
                    ? "Please wait…"
                    : mode === "register"
                      ? "Create account"
                      : mode === "forgot"
                        ? "Send reset link"
                        : "Sign in"}
                </AppButton>
              </View>
              <SupportCard />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <OrderDetailsModal
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
      />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        className="flex-1"
      >
        <View className="gap-5 px-4 pb-6 pt-4">
          <View className="gap-2">
            <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-muted">
              Account
            </Text>
            <Text className="text-[30px] font-extrabold leading-[35px] text-brand-800">
              {user?.name || "Yousuf Rice customer"}
            </Text>
            <Text className="text-[15px] text-body">{user?.email}</Text>
          </View>
          <View className="flex-row items-center justify-between rounded-card border border-line bg-white p-4">
            <View className="flex-1">
              <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-muted">
                Customer profile
              </Text>
              <Text className="mt-1 text-[18px] font-extrabold text-ink">
                {customer?.full_name || user?.name || "Not linked yet"}
              </Text>
              <Text className="mt-1 text-[13px] text-muted">
                {customer?.phone
                  ? formatPhoneNumberForDisplay(customer.phone)
                  : "Place an order to save your phone"}
              </Text>
            </View>
            <AppButton variant="outline" size="sm" onPress={handleSignOut}>
              Sign out
            </AppButton>
          </View>
          <View className="gap-1 rounded-card bg-brand-50 p-4">
            <Text className="text-[15px] font-extrabold text-brand-800">
              Next checkout will remember you
            </Text>
            <Text className="text-[13px] leading-5 text-brand-700">
              Your account is attached to new COD orders, so support and
              delivery teams can find your history without asking again.
            </Text>
          </View>
          <NotificationCard
            pushStatus={pushStatus}
            registeringPush={registeringPush}
            onPress={handleRegisterPush}
          />
          <View className="flex-row items-center justify-between">
            <Text className="text-[20px] font-extrabold text-brand-800">
              Recent orders
            </Text>
            <AppButton
              disabled={refreshing}
              size="sm"
              variant="outline"
              onPress={handleRefresh}
            >
              Refresh
            </AppButton>
          </View>
          {ordersError && (
            <View className="gap-2 rounded-card border border-coral-100 bg-coral-50 p-4">
              <Text className="text-[16px] font-extrabold text-coral-700">
                Could not load orders
              </Text>
              <Text className="text-[13px] leading-5 text-coral-700">
                {ordersError}
              </Text>
            </View>
          )}
          {!ordersError && orders.length === 0 && (
            <View className="gap-2 rounded-card border border-line bg-white p-4">
              <Text className="text-[17px] font-extrabold text-ink">
                No linked orders yet
              </Text>
              <Text className="text-[13px] leading-5 text-body">
                Your next mobile checkout will appear here after it is placed.
              </Text>
            </View>
          )}
          {orders.map((order) => (
            <OrderSummary
              key={order.$id}
              onPress={() => setSelectedOrderId(order.$id)}
              order={order}
            />
          ))}
          <SupportCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationCard({
  guest,
  onPress,
  pushStatus,
  registeringPush,
}: {
  guest?: boolean;
  onPress: () => void;
  pushStatus: string | null;
  registeringPush: boolean;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-card border border-brand-200 bg-brand-50 p-4">
      <View className="flex-1 gap-1">
        <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-brand-700">
          Mobile notifications
        </Text>
        <Text className="text-[16px] font-extrabold text-brand-800">
          {guest
            ? "Order alerts without an account"
            : "Delivery updates on this device"}
        </Text>
        <Text className="text-[13px] leading-5 text-brand-700">
          {guest
            ? "Enable this device as a guest. You can sign in later."
            : "Enable Appwrite push targets for order movement and offers."}
        </Text>
        {pushStatus && (
          <Text className="text-[12px] font-bold text-brand-700">
            {pushStatus}
          </Text>
        )}
      </View>
      <AppButton disabled={registeringPush} size="sm" onPress={onPress}>
        {registeringPush ? "Enabling…" : "Enable"}
      </AppButton>
    </View>
  );
}
function OrderSummary({
  onPress,
  order,
}: {
  onPress: () => void;
  order: Order;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="gap-3 rounded-card border border-line bg-white p-4 active:bg-brand-50"
    >
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-[15px] font-extrabold text-ink">
            Order {order.$id.slice(-8).toUpperCase()}
          </Text>
          <Text className="mt-1 text-[12px] text-muted">
            {new Date(order.$createdAt).toLocaleDateString([], {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <Text className="rounded-full bg-brand-100 px-3 py-1.5 text-[11px] font-bold text-brand-700">
          {orderStatusLabel(order.status)}
        </Text>
      </View>
      <View className="flex-row items-center justify-between border-t border-line pt-3">
        <Text className="text-[12px] font-semibold text-muted">
          {order.total_weight_kg || 0}kg · View details
        </Text>
        <Text className="text-[18px] font-extrabold text-brand-800">
          {formatCurrency(order.total_price)}
        </Text>
      </View>
    </Pressable>
  );
}
function SupportCard() {
  return (
    <View className="gap-3 rounded-card border border-line bg-white p-4">
      <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-muted">
        Karachi customer care
      </Text>
      <Text className="text-[18px] font-extrabold text-brand-800">
        Need help with an order?
      </Text>
      <Text className="text-[13px] leading-5 text-body">
        Call or email Yousuf Rice directly from your phone.
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <AppButton
            size="sm"
            variant="outline"
            onPress={() => Linking.openURL("tel:+923332339557")}
          >
            Call support
          </AppButton>
        </View>
        <View className="flex-1">
          <AppButton
            size="sm"
            variant="outline"
            onPress={() => Linking.openURL("mailto:support@yousufrice.com")}
          >
            Email
          </AppButton>
        </View>
      </View>
    </View>
  );
}
function Field({
  label,
  ...props
}: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "phone-pad";
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[12px] font-bold text-body">{label}</Text>
      <TextInput
        {...props}
        autoCorrect={false}
        placeholderTextColor="#A3A5B5"
        className="rounded-xl border border-line bg-canvas px-3.5 py-3 text-[15px] text-ink"
      />
    </View>
  );
}
