import type { Customer, Order } from "@repo/types";
import { formatCurrency, formatPhoneNumberForDisplay } from "@repo/utils";
import { Button } from "@repo/ui";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CUSTOMERS_TABLE_ID,
  DATABASE_ID,
  ORDERS_TABLE_ID,
  Query,
  tablesDB,
} from "@/lib/appwrite";
import { useAuth } from "@/lib/auth";
import { registerMobilePushTarget } from "@/lib/mobile-notifications";

type AuthMode = "signIn" | "register";

interface RowList<T> {
  rows?: T[];
  documents?: T[];
  total?: number;
}

function rowsFromResponse<T>(response: RowList<T>): T[] {
  return response.rows ?? response.documents ?? [];
}

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

function canLoadOrders() {
  return Boolean(DATABASE_ID && CUSTOMERS_TABLE_ID && ORDERS_TABLE_ID);
}

export default function AccountScreen() {
  const { error, isAuthenticated, loading, refreshUser, register, signIn, signOut, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [registeringPush, setRegisteringPush] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
  });

  const setField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

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
      setOrders(rowsFromResponse<Order>(ordersResponse as unknown as RowList<Order>));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Could not load your order history.";
      setOrdersError(message);
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

    if (!email || !password || (mode === "register" && !name)) {
      Alert.alert("Missing details", "Please fill in the required account fields.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        await register({ email, name, password });
      } else {
        await signIn({ email, password });
      }

      setFormData({ email: "", name: "", password: "" });
      await loadOrders();
    } catch (caughtError) {
      Alert.alert(
        mode === "register" ? "Could not create account" : "Could not sign in",
        caughtError instanceof Error ? caughtError.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
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
      setPushStatus(`Notifications enabled for this ${target.platform} device.`);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Could not enable notifications.";
      setPushStatus(message);
      Alert.alert("Notifications unavailable", message);
    } finally {
      setRegisteringPush(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Yousuf Rice account</Text>
              <Text style={styles.title}>Order faster next time</Text>
              <Text style={styles.subtitle}>
                Save your customer profile, connect new orders to your phone, and keep your
                delivery history in one place.
              </Text>
            </View>

            <View style={styles.notificationCard}>
              <View style={styles.notificationCopy}>
                <Text style={styles.cardLabel}>Mobile notifications</Text>
                <Text style={styles.notificationTitle}>Order alerts without an account</Text>
                <Text style={styles.profileMeta}>
                  Enable this device as a guest. You can still sign in or create an account later.
                </Text>
                {!!pushStatus && <Text style={styles.pushStatus}>{pushStatus}</Text>}
              </View>
              <Button disabled={registeringPush} size="sm" onPress={handleRegisterPush}>
                {registeringPush ? "Enabling..." : "Enable"}
              </Button>
            </View>

            <View style={styles.segmentedControl}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMode("signIn")}
                style={[styles.segment, mode === "signIn" && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, mode === "signIn" && styles.segmentTextActive]}>
                  Sign in
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMode("register")}
                style={[styles.segment, mode === "register" && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, mode === "register" && styles.segmentTextActive]}>
                  Create account
                </Text>
              </Pressable>
            </View>

            <View style={styles.formCard}>
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
              <Field
                label="Password"
                onChangeText={(value) => setField("password", value)}
                placeholder="Minimum 8 characters"
                secureTextEntry
                value={formData.password}
              />

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <Button disabled={loading || submitting} size="lg" onPress={handleSubmit}>
                {submitting
                  ? "Please wait..."
                  : mode === "register"
                    ? "Create Account"
                    : "Sign In"}
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>{user?.name || "Yousuf Rice customer"}</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
        </View>

        <View style={styles.profileCard}>
          <View>
            <Text style={styles.cardLabel}>Customer profile</Text>
            <Text style={styles.profileName}>{customer?.full_name || user?.name || "Not linked yet"}</Text>
            <Text style={styles.profileMeta}>
              {customer?.phone ? formatPhoneNumberForDisplay(customer.phone) : "Place an order to save your phone"}
            </Text>
          </View>
          <Button variant="outline" size="sm" onPress={handleSignOut}>
            Sign out
          </Button>
        </View>

        <View style={styles.infoBand}>
          <Text style={styles.infoTitle}>Next checkout will remember you</Text>
          <Text style={styles.infoText}>
            Your app account is attached to new COD orders, so support and delivery teams can
            find your order history without asking for details again.
          </Text>
        </View>

        <View style={styles.notificationCard}>
          <View style={styles.notificationCopy}>
            <Text style={styles.cardLabel}>Mobile notifications</Text>
            <Text style={styles.notificationTitle}>Delivery updates on this device</Text>
            <Text style={styles.profileMeta}>
              Enable Appwrite push targets for order movement and customer offers.
            </Text>
            {!!pushStatus && <Text style={styles.pushStatus}>{pushStatus}</Text>}
          </View>
          <Button disabled={registeringPush} size="sm" onPress={handleRegisterPush}>
            {registeringPush ? "Enabling..." : "Enable"}
          </Button>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent orders</Text>
          <Button disabled={refreshing} size="sm" variant="outline" onPress={handleRefresh}>
            Refresh
          </Button>
        </View>

        {ordersError && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Could not load orders</Text>
            <Text style={styles.emptyText}>{ordersError}</Text>
          </View>
        )}

        {!ordersError && orders.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No linked orders yet</Text>
            <Text style={styles.emptyText}>
              Your next mobile checkout will appear here after it is placed.
            </Text>
          </View>
        )}

        {orders.map((order) => (
          <View key={order.$id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <View>
                <Text style={styles.orderId}>Order {order.$id.slice(-8).toUpperCase()}</Text>
                <Text style={styles.orderDate}>
                  {new Date(order.$createdAt).toLocaleDateString([], {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{orderStatusLabel(order.status)}</Text>
              </View>
            </View>
            <View style={styles.orderFooter}>
              <Text style={styles.orderMeta}>{order.total_weight_kg || 0}kg</Text>
              <Text style={styles.orderTotal}>{formatCurrency(order.total_price)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        autoCorrect={false}
        placeholderTextColor="#94a3b8"
        style={styles.input}
      />
    </View>
  );
}

const brandBlue = "#27247b";
const brandYellow = "#ffff03";

const styles = StyleSheet.create({
  cardLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  container: {
    gap: 16,
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
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
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
  header: {
    gap: 6,
    paddingTop: 12,
  },
  infoBand: {
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  infoText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  infoTitle: {
    color: "#14532d",
    fontSize: 15,
    fontWeight: "900",
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
  keyboardView: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  orderDate: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  orderFooter: {
    alignItems: "center",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  orderId: {
    color: brandBlue,
    fontSize: 16,
    fontWeight: "900",
  },
  orderMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
  },
  orderTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  notificationCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  notificationCopy: {
    flex: 1,
    gap: 3,
  },
  notificationTitle: {
    color: brandBlue,
    fontSize: 16,
    fontWeight: "900",
  },
  orderTotal: {
    color: "#047857",
    fontSize: 18,
    fontWeight: "900",
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  profileMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  profileName: {
    color: brandBlue,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
  },
  pushStatus: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 4,
  },
  safeArea: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: brandBlue,
    fontSize: 20,
    fontWeight: "900",
  },
  segment: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  segmentActive: {
    backgroundColor: brandBlue,
  },
  segmentedControl: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  segmentText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: brandYellow,
  },
  statusPill: {
    backgroundColor: "#fefce8",
    borderColor: brandYellow,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: brandBlue,
    fontSize: 11,
    fontWeight: "900",
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
});
