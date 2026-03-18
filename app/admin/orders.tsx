import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, Pressable,
  StyleSheet, ActivityIndicator, Linking, Platform, Alert,
} from "react-native";
import { router } from "expo-router";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";

const TOKEN_KEY = "freshcart_token";
const ROLE_KEY = "freshcart_role";

const STORE_EMOJIS: Record<string, string> = {
  "Any Store": "🏪",
  "Walmart": "🛒",
  "No Frills": "🥬",
  "Metro": "🏙️",
  "LCBO": "🍷",
  "Dollarama": "💛",
  "Costco": "🏢",
};

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "picked_up" | "delivered" | "cancelled";

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  deliveryTime: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  storeName?: string;
  shoppingList?: string;
  items?: Array<{
    id: string;
    qty: number;
    price: number;
    product?: { name: string };
  }>;
  user?: { phone: string };
};

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const notify = (title: string, msg: string) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = await storage.getItem(TOKEN_KEY);
      if (!token) { router.replace("/admin/login"); return; }

      const res = await fetch(`${API_BASE_URL}/admin/orders`, {
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

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      setUpdatingId(id);
      const token = await storage.getItem(TOKEN_KEY);

      const res = await fetch(`${API_BASE_URL}/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify("Error", data.message || "Could not update order.");
        return;
      }
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    } catch {
      notify("Error", "Could not connect to server.");
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmCancel = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Cancel this order? The customer will see it as cancelled.")) {
        updateStatus(id, "cancelled");
      }
    } else {
      Alert.alert("Cancel order?", "The customer will see it as cancelled.", [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => updateStatus(id, "cancelled") },
      ]);
    }
  };

  const callCustomer = async (phone?: string) => {
    if (!phone?.trim()) { notify("No phone", "No phone number on this order."); return; }
    try {
      await Linking.openURL(`tel:${phone.trim()}`);
    } catch {
      notify("Error", "Could not open phone dialer.");
    }
  };

  const logout = async () => {
    await storage.multiRemove([TOKEN_KEY, ROLE_KEY]);
    router.replace("/admin/login");
  };

  const pillColor = (status: OrderStatus) => {
    if (status === "pending") return styles.pillPending;
    if (status === "confirmed") return styles.pillConfirmed;
    if (status === "preparing") return styles.pillPreparing;
    if (status === "ready") return styles.pillReady;
    if (status === "picked_up") return styles.pillPickedUp;
    if (status === "delivered") return styles.pillDelivered;
    return styles.pillCancelled;
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return ""; }
  };

  const pending = orders.filter(o => o.status === "pending").length;
  const active = orders.filter(o => ["confirmed", "preparing", "ready", "picked_up"].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === "delivered").length;

  return (
    <View style={styles.container}>

      {/* ─── TOP BAR ─── */}
      <View style={styles.topRow}>
        <Text style={styles.title}>🛒 Admin</Text>
        <View style={styles.btnGroup}>
          <Pressable style={styles.smallBtn} onPress={load} disabled={loading}>
            <Text style={styles.smallText}>{loading ? "..." : "Refresh"}</Text>
          </Pressable>
          <Pressable style={styles.customerBtn} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.customerText}>Customer App</Text>
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {/* ─── STATS ─── */}
      <View style={styles.statsRow}>
        <View style={[styles.stat, { backgroundColor: "#fef3c7" }]}>
          <Text style={styles.statNum}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: "#dbeafe" }]}>
          <Text style={styles.statNum}>{active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: "#dcfce7" }]}>
          <Text style={styles.statNum}>{delivered}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: "#f3f4f6" }]}>
          <Text style={styles.statNum}>{orders.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* ─── CONTENT ─── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111" />
          <Text style={{ marginTop: 12, color: "#666" }}>Loading orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={[styles.smallBtn, { marginTop: 14 }]} onPress={load}>
            <Text style={styles.smallText}>Try Again</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>📭</Text>
          <Text style={styles.empty}>No orders yet.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => {
            const isUpdating = updatingId === item.id;
            const canConfirm = item.status === "pending";
            const canPrepare = item.status === "confirmed";
            const canDeliver = ["preparing", "ready", "picked_up"].includes(item.status);
            const canCancel = ["pending", "confirmed", "preparing"].includes(item.status);
            const storeEmoji = STORE_EMOJIS[item.storeName || "Any Store"] || "🏪";

            return (
              <View style={styles.card}>
                {/* ORDER HEADER */}
                <View style={styles.cardTop}>
                  <Text style={styles.orderNum}>{item.orderNumber}</Text>
                  <View style={[styles.pill, pillColor(item.status)]}>
                    <Text style={styles.pillText}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>

                {/* ✅ STORE BADGE */}
                {item.storeName && (
                  <View style={styles.storeBadge}>
                    <Text style={styles.storeBadgeText}>
                      {storeEmoji} Shop from: {item.storeName}
                    </Text>
                  </View>
                )}

                {/* ORDER INFO */}
                <Text style={styles.meta}>👤 {item.customerName}</Text>
                <Text style={styles.meta}>📞 {item.phone || item.user?.phone || "No phone"}</Text>
                <Text style={styles.meta}>📍 {item.address}</Text>
                <Text style={styles.meta}>🕐 {item.deliveryTime} • 💳 {item.paymentMethod}</Text>
                <Text style={styles.meta}>📅 {formatDate(item.createdAt)}</Text>

                {/* ✅ SHOPPING LIST */}
                {item.shoppingList && item.shoppingList.trim() !== "" && (
                  <View style={styles.shoppingBox}>
                    <Text style={styles.shoppingTitle}>🛍️ Shopping List</Text>
                    <Text style={styles.shoppingText}>{item.shoppingList}</Text>
                  </View>
                )}

                {/* ITEMS */}
                {item.items && item.items.length > 0 && (
                  <View style={styles.itemsBox}>
                    <Text style={styles.itemsTitle}>Items ({item.items.length})</Text>
                    {item.items.map((i) => (
                      <Text key={i.id} style={styles.itemLine}>
                        • {i.product?.name || "Product"} x{i.qty} — ${Number(i.price).toFixed(2)}
                      </Text>
                    ))}
                  </View>
                )}

                {/* TOTALS */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>${Number(item.subtotal).toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Delivery Fee</Text>
                  <Text style={styles.totalValue}>${Number(item.deliveryFee).toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, { marginTop: 2 }]}>
                  <Text style={[styles.totalLabel, { fontWeight: "900", fontSize: 15 }]}>Total</Text>
                  <Text style={[styles.totalValue, { fontWeight: "900", fontSize: 15 }]}>
                    ${Number(item.total).toFixed(2)}
                  </Text>
                </View>

                {/* ACTION BUTTONS */}
                {isUpdating ? (
                  <ActivityIndicator style={{ marginTop: 12 }} color="#111" />
                ) : (
                  <View style={styles.row}>
                    <Pressable
                      style={[styles.btnGreen, !canConfirm && styles.disabled]}
                      disabled={!canConfirm}
                      onPress={() => updateStatus(item.id, "confirmed")}
                    >
                      <Text style={styles.btnWhiteText}>✅ Accept</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.btnBlue, !canPrepare && styles.disabled]}
                      disabled={!canPrepare}
                      onPress={() => updateStatus(item.id, "preparing")}
                    >
                      <Text style={styles.btnWhiteText}>🛒 Shopping</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.btnGreen, !canDeliver && styles.disabled]}
                      disabled={!canDeliver}
                      onPress={() => updateStatus(item.id, "delivered")}
                    >
                      <Text style={styles.btnWhiteText}>🚚 Delivered</Text>
                    </Pressable>

                    <Pressable
                      style={styles.btnCall}
                      onPress={() => callCustomer(item.phone || item.user?.phone)}
                    >
                      <Text style={styles.btnWhiteText}>📞 Call</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.btnCancel, !canCancel && styles.disabled]}
                      disabled={!canCancel}
                      onPress={() => confirmCancel(item.id)}
                    >
                      <Text style={styles.btnCancelText}>❌ Cancel</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16, paddingTop: 60 },

  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "900", flex: 1 },
  btnGroup: { flexDirection: "row", gap: 6 },

  smallBtn: { backgroundColor: "#111", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  smallText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  customerBtn: { backgroundColor: "#2b6cb0", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  customerText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  logoutBtn: { backgroundColor: "#b91c1c", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  logoutText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  stat: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 11, color: "#555", fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { fontSize: 16, color: "#666", fontWeight: "700", marginTop: 8 },
  errorText: { color: "#b91c1c", fontWeight: "700", textAlign: "center" },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },

  orderNum: { fontWeight: "900", fontSize: 15 },
  meta: { color: "#444", marginTop: 3, fontWeight: "600", fontSize: 13 },

  // ✅ Store badge
  storeBadge: {
    backgroundColor: "#f0faf0", borderRadius: 8,
    padding: 8, marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: "#1a7a2e",
  },
  storeBadgeText: { color: "#1a7a2e", fontWeight: "900", fontSize: 14 },

  // ✅ Shopping list
  shoppingBox: {
    backgroundColor: "#fffbeb", borderRadius: 8,
    padding: 10, marginTop: 8,
    borderLeftWidth: 3, borderLeftColor: "#d97706",
  },
  shoppingTitle: { fontWeight: "900", color: "#d97706", marginBottom: 4, fontSize: 13 },
  shoppingText: { color: "#444", fontSize: 13, lineHeight: 20 },

  itemsBox: { backgroundColor: "#f9fafb", borderRadius: 8, padding: 8, marginTop: 8 },
  itemsTitle: { fontWeight: "900", marginBottom: 4 },
  itemLine: { color: "#333", marginTop: 2, fontSize: 13 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  totalLabel: { color: "#666", fontWeight: "700" },
  totalValue: { color: "#111", fontWeight: "700" },

  row: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },

  btnGreen: { backgroundColor: "#16a34a", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10 },
  btnBlue: { backgroundColor: "#2b6cb0", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10 },
  btnCall: { backgroundColor: "#7c3aed", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10 },
  btnWhiteText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  btnCancel: { borderWidth: 1, borderColor: "#b91c1c", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10 },
  btnCancelText: { fontWeight: "900", color: "#b91c1c", fontSize: 12 },

  disabled: { opacity: 0.35 },

  pill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { color: "#fff", fontWeight: "900", fontSize: 10 },

  pillPending: { backgroundColor: "#d97706" },
  pillConfirmed: { backgroundColor: "#2b6cb0" },
  pillPreparing: { backgroundColor: "#7c3aed" },
  pillReady: { backgroundColor: "#0891b2" },
  pillPickedUp: { backgroundColor: "#ea580c" },
  pillDelivered: { backgroundColor: "#16a34a" },
  pillCancelled: { backgroundColor: "#b91c1c" },
});