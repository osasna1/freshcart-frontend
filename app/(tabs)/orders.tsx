import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";

const TOKEN_KEY = "freshcart_token";
const CUSTOMER_KEY = "freshcart_customer";
const ROLE_KEY = "freshcart_role";
const CUSTOMER_PHONE_KEY = "freshcart_customer_phone";

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  address: string;
  deliveryTime: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  customerName: string;
  items?: Array<{
    id: string;
    productId: string;
    qty: number;
    price: number;
    product?: { name: string };
  }>;
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = await storage.getItem(TOKEN_KEY);

      if (!token) {
        setError("not_logged_in");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.message || "Could not load orders.");
        return;
      }

      setOrders(data.orders || []);
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logout = async () => {
    const confirm = () => {
      storage.multiRemove([TOKEN_KEY, CUSTOMER_KEY, ROLE_KEY, CUSTOMER_PHONE_KEY]);
      router.replace("/(auth)/login");
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to logout?")) {
        confirm();
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: confirm },
      ]);
    }
  };

  const pillColor = (status: string) => {
    if (status === "pending") return styles.pillPending;
    if (status === "confirmed") return styles.pillAccepted;
    if (status === "delivered") return styles.pillDelivered;
    if (status === "cancelled") return styles.pillCancelled;
    return styles.pillPending;
  };

  const statusMessage = (status: string) => {
    if (status === "pending") return "🕐 Order received! Waiting for confirmation.";
    if (status === "confirmed") return "✅ Order confirmed! We're getting ready to shop.";
    if (status === "preparing") return "🛒 We're shopping for your items right now!";
    if (status === "ready") return "📦 Your order is packed and ready for pickup!";
    if (status === "picked_up") return "🚗 Your order is out for delivery!";
    if (status === "delivered") return "🎉 Delivered! Thanks for shopping with FreshCart.";
    if (status === "cancelled") return "❌ Your order was cancelled. Please place a new order.";
    return "";
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return "";
    }
  };

  // Not logged in
  if (error === "not_logged_in") {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Please log in</Text>
        <Text style={styles.emptyText}>You need to be logged in to view your orders.</Text>
        <Pressable
          style={[styles.primaryBtn, { marginTop: 14 }]}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.primaryText}>Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ─── TOP ROW — title + refresh + logout ─── */}
      <View style={styles.topRow}>
        <Text style={styles.title}>My Orders</Text>
        <View style={styles.btnGroup}>
          <Pressable style={styles.smallBtn} onPress={load} disabled={loading}>
            <Text style={styles.smallText}>{loading ? "..." : "Refresh"}</Text>
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {/* ─── CONTENT ─── */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#111" />
            <Text style={{ marginTop: 12, color: "#666" }}>Loading orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable style={[styles.primaryBtn, { marginTop: 14 }]} onPress={load}>
              <Text style={styles.primaryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 48 }}>🛒</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>Your orders will appear here.</Text>
            <Pressable
              style={[styles.primaryBtn, { marginTop: 14 }]}
              onPress={() => router.replace("/(tabs)/products")}
            >
              <Text style={styles.primaryText}>Shop Products</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.orderNum}>{item.orderNumber}</Text>
                  <View style={[styles.pill, pillColor(item.status)]}>
                    <Text style={styles.pillText}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.meta}>📅 {formatDate(item.createdAt)}</Text>
                <Text style={styles.meta}>📍 {item.address}</Text>
                <Text style={styles.meta}>
                  🕐 {item.deliveryTime} • 💳 {item.paymentMethod} • 💰 ${Number(item.total).toFixed(2)}
                </Text>

                <Text style={styles.notice}>{statusMessage(item.status)}</Text>

                {item.items && item.items.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.itemsTitle}>Items ({item.items.length})</Text>
                    {item.items.slice(0, 3).map((i) => (
                      <Text key={i.id} style={styles.itemLine}>
                        • x{i.qty} — ${Number(i.price).toFixed(2)} each
                      </Text>
                    ))}
                    {item.items.length > 3 && (
                      <Text style={styles.more}>+ {item.items.length - 3} more items</Text>
                    )}
                  </View>
                )}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>${Number(item.subtotal).toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Delivery Fee</Text>
                  <Text style={styles.totalValue}>${Number(item.deliveryFee).toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, { marginTop: 4 }]}>
                  <Text style={[styles.totalLabel, { fontWeight: "900", fontSize: 15 }]}>Total</Text>
                  <Text style={[styles.totalValue, { fontWeight: "900", fontSize: 15 }]}>
                    ${Number(item.total).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, paddingTop: 60 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "900", flex: 1 },

  btnGroup: { flexDirection: "row", gap: 8 },

  smallBtn: {
    backgroundColor: "#111",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  smallText: { color: "#fff", fontWeight: "900" },

  logoutBtn: {
    backgroundColor: "#b91c1c",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  logoutText: { color: "#fff", fontWeight: "900" },

  content: { flex: 1 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "900", marginTop: 12 },
  emptyText: { marginTop: 6, color: "#666", textAlign: "center", fontWeight: "700" },

  primaryBtn: { backgroundColor: "#111", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  primaryText: { color: "#fff", fontWeight: "900" },

  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },

  orderNum: { fontWeight: "900", fontSize: 15 },
  meta: { color: "#444", marginTop: 4, fontWeight: "600" },

  notice: {
    marginTop: 10,
    fontWeight: "800",
    color: "#111",
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 8,
  },

  itemsTitle: { fontWeight: "900", marginTop: 4, marginBottom: 4 },
  itemLine: { marginTop: 3, color: "#333" },
  more: { marginTop: 3, color: "#666", fontWeight: "700" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  totalLabel: { color: "#666", fontWeight: "700" },
  totalValue: { color: "#111", fontWeight: "700" },

  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { color: "#fff", fontWeight: "900", fontSize: 11 },

  pillPending: { backgroundColor: "#d97706" },
  pillAccepted: { backgroundColor: "#2b6cb0" },
  pillDelivered: { backgroundColor: "#2f855a" },
  pillCancelled: { backgroundColor: "#b91c1c" },
});