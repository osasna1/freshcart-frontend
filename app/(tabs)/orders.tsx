import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, Platform, Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";
import { CartStore } from "../../lib/cartStore";

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
  serviceFee: number;
  total: number;
  status: string;
  customerName: string;
  storeName?: string;
  city?: string;
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

  // ✅ Use useFocusEffect so orders reload every time you visit this screen
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = await storage.getItem(TOKEN_KEY);
      if (!token) { setError("not_logged_in"); return; }
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.message || "Could not load orders."); return; }
      setOrders(data.orders || []);
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, []));

  const logout = async () => {
    const confirm = async () => {
      await CartStore.clearCart();
      await storage.multiRemove([TOKEN_KEY, CUSTOMER_KEY, ROLE_KEY, CUSTOMER_PHONE_KEY]);
      router.replace("/(auth)/login");
    };
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to logout?")) confirm();
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: confirm },
      ]);
    }
  };

  const pillColor = (status: string) => {
    if (status === "pending") return styles.pillPending;
    if (status === "confirmed") return styles.pillConfirmed;
    if (status === "preparing") return styles.pillPreparing;
    if (status === "ready") return styles.pillReady;
    if (status === "picked_up") return styles.pillPickedUp;
    if (status === "delivered") return styles.pillDelivered;
    if (status === "cancelled") return styles.pillCancelled;
    return styles.pillPending;
  };

  const statusMessage = (status: string) => {
    if (status === "pending") return "🕐 Order received! Waiting for confirmation.";
    if (status === "confirmed") return "✅ Order confirmed! We're getting ready to shop.";
    if (status === "preparing") return "🛒 We're shopping for your items right now!";
    if (status === "ready") return "📦 Your order is packed and ready!";
    if (status === "picked_up") return "🚗 Your order is out for delivery!";
    if (status === "delivered") return "🎉 Delivered! Thanks for shopping with FreshCart.";
    if (status === "cancelled") return "❌ Your order was cancelled.";
    return "";
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return ""; }
  };

  if (error === "not_logged_in") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerAccentBar} />
          <Text style={styles.headerTitle}>My Orders 📦</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔐</Text>
          <Text style={styles.emptyTitle}>Please log in</Text>
          <Text style={styles.emptyText}>You need to be logged in to view your orders.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.primaryText}>Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerAccentBar} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>My Orders 📦</Text>
            <Text style={styles.headerSub}>{orders.length} order{orders.length !== 1 ? "s" : ""} total</Text>
          </View>
          <View style={styles.btnGroup}>
            <Pressable style={styles.refreshBtn} onPress={load} disabled={loading}>
              <Text style={styles.refreshText}>{loading ? "..." : "↻ Refresh"}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ─── CONTENT ─── */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1a7a2e" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable style={styles.primaryBtn} onPress={load}>
              <Text style={styles.primaryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>Your orders will appear here.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)/")}>
              <Text style={styles.primaryText}>🛍️ Shop Now</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 16, paddingTop: 8 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardAccentBar} />
                <View style={styles.cardInner}>
                  <View style={styles.cardTop}>
                    <Text style={styles.orderNum}>{item.orderNumber}</Text>
                    <View style={[styles.pill, pillColor(item.status)]}>
                      <Text style={styles.pillText}>{item.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  {/* ✅ Store and city info */}
                  {item.storeName && (
                    <Text style={styles.storeMeta}>
                      🏪 {item.storeName}{item.city ? ` · ${item.city}` : ""}
                    </Text>
                  )}

                  <Text style={styles.meta}>📅 {formatDate(item.createdAt)}</Text>
                  <Text style={styles.meta}>📍 {item.address}</Text>
                  <Text style={styles.meta}>🕐 {item.deliveryTime} · 💳 {item.paymentMethod}</Text>

                  <View style={styles.noticeBanner}>
                    <Text style={styles.noticeText}>{statusMessage(item.status)}</Text>
                  </View>

                  {item.items && item.items.length > 0 && (
                    <View style={styles.itemsBox}>
                      <Text style={styles.itemsTitle}>Items ({item.items.length})</Text>
                      {item.items.slice(0, 3).map((i) => (
                        <Text key={i.id} style={styles.itemLine}>
                          • {i.product?.name || "Product"} x{i.qty} — ${Number(i.price).toFixed(2)} each
                        </Text>
                      ))}
                      {item.items.length > 3 && (
                        <Text style={styles.more}>+ {item.items.length - 3} more items</Text>
                      )}
                    </View>
                  )}

                  <View style={styles.totalsBox}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Subtotal</Text>
                      <Text style={styles.totalValue}>${Number(item.subtotal).toFixed(2)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Delivery Fee</Text>
                      <Text style={styles.totalValue}>
                        {Number(item.deliveryFee) === 0 ? "🎉 FREE" : `$${Number(item.deliveryFee).toFixed(2)}`}
                      </Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Service Fee</Text>
                      <Text style={styles.totalValue}>${Number(item.serviceFee || 2.99).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                      <Text style={styles.grandTotalLabel}>Total</Text>
                      <Text style={styles.grandTotalValue}>${Number(item.total).toFixed(2)}</Text>
                    </View>
                  </View>
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
  container: { flex: 1, backgroundColor: "#f4f7f5" },
  header: {
    backgroundColor: "#1a7a2e", paddingTop: 60, paddingBottom: 20,
    paddingHorizontal: 20, overflow: "hidden",
  },
  headerAccentBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 5, backgroundColor: "#f5c518",
  },
  headerRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 13, color: "#a7f3d0", fontWeight: "600", marginTop: 2 },
  btnGroup: { flexDirection: "row", gap: 8 },
  refreshBtn: {
    backgroundColor: "#f5c518", paddingVertical: 8,
    paddingHorizontal: 14, borderRadius: 20,
  },
  refreshText: { color: "#111", fontWeight: "900", fontSize: 13 },
  content: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#111" },
  emptyText: { color: "#666", textAlign: "center", fontWeight: "600", fontSize: 14 },
  loadingText: { marginTop: 12, color: "#666", fontWeight: "600" },
  primaryBtn: {
    backgroundColor: "#1a7a2e", paddingVertical: 14,
    paddingHorizontal: 28, borderRadius: 14, marginTop: 4,
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, marginTop: 12,
    overflow: "hidden", shadowColor: "#000",
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderBottomWidth: 3, borderBottomColor: "#f5c518",
  },
  cardAccentBar: { height: 4, backgroundColor: "#1a7a2e" },
  cardInner: { padding: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  orderNum: { fontWeight: "900", fontSize: 16, color: "#111" },
  storeMeta: { color: "#1a7a2e", fontWeight: "800", fontSize: 13, marginBottom: 4 },
  meta: { color: "#555", marginTop: 4, fontWeight: "600", fontSize: 13 },
  noticeBanner: {
    backgroundColor: "#f0faf4", borderRadius: 10, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: "#d1fae5",
  },
  noticeText: { fontWeight: "800", color: "#1a7a2e", fontSize: 13 },
  itemsBox: {
    backgroundColor: "#fffbeb", borderRadius: 10, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: "#f5c518",
  },
  itemsTitle: { fontWeight: "900", marginBottom: 4, color: "#111", fontSize: 13 },
  itemLine: { marginTop: 3, color: "#555", fontWeight: "600", fontSize: 12 },
  more: { marginTop: 3, color: "#999", fontWeight: "700", fontSize: 12 },
  totalsBox: {
    backgroundColor: "#f9fafb", borderRadius: 10, padding: 10, marginTop: 10,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { color: "#666", fontWeight: "700", fontSize: 13 },
  totalValue: { color: "#111", fontWeight: "700", fontSize: 13 },
  grandTotalRow: {
    borderTopWidth: 1, borderTopColor: "#e8e8e8",
    paddingTop: 8, marginTop: 4, marginBottom: 0,
  },
  grandTotalLabel: { fontSize: 15, fontWeight: "900", color: "#111" },
  grandTotalValue: { fontSize: 15, fontWeight: "900", color: "#1a7a2e" },
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { color: "#fff", fontWeight: "900", fontSize: 11 },
  pillPending: { backgroundColor: "#d97706" },
  pillConfirmed: { backgroundColor: "#2b6cb0" },
  pillPreparing: { backgroundColor: "#7c3aed" },
  pillReady: { backgroundColor: "#0891b2" },
  pillPickedUp: { backgroundColor: "#f5c518" },
  pillDelivered: { backgroundColor: "#1a7a2e" },
  pillCancelled: { backgroundColor: "#b91c1c" },
});