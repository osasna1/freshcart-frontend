import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";

const ORDERS_KEY = "freshcart_orders";

type OrderStatus = "NEW" | "ACCEPTED" | "DELIVERED" | "CANCELLED";

type Order = {
  id: string;
  createdAt: string;
  customer: { fullName: string; phone: string };
  address: string;
  deliveryTime: string;
  payment: "CASH" | "ETRANSFER";
  total: number;
  status: OrderStatus;
  items?: Array<{ id: string; name: string; price: number; qty: number; lineTotal: number }>;
};

export default function OrderDetails() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(ORDERS_KEY);
      const parsed: Order[] = raw ? JSON.parse(raw) : [];
      const found = parsed.find((o) => String(o.id) === String(id)) || null;
      setOrder(found);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const createdLabel = useMemo(() => {
    if (!order?.createdAt) return "";
    try {
      return new Date(order.createdAt).toLocaleString();
    } catch {
      return "";
    }
  }, [order?.createdAt]);

  const setStatus = async (status: OrderStatus) => {
    if (!order) return;

    try {
      setLoading(true);

      const raw = await AsyncStorage.getItem(ORDERS_KEY);
      const parsed: Order[] = raw ? JSON.parse(raw) : [];

      const updated = parsed.map((o) =>
        o.id === order.id ? { ...o, status } : o
      );

      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated));

      // update local state
      setOrder((prev) => (prev ? { ...prev, status } : prev));
    } catch {
      Alert.alert("Error", "Could not update status. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const confirmCancel = () => {
    if (!order) return;

    Alert.alert(
      "Cancel order?",
      "Do you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => setStatus("CANCELLED") },
      ]
    );
  };

  const callCustomer = async () => {
    if (!order?.customer?.phone) {
      Alert.alert("No phone", "Customer phone number is missing.");
      return;
    }
    try {
      await Linking.openURL(`tel:${order.customer.phone}`);
    } catch {
      Alert.alert("Error", "Could not open phone dialer.");
    }
  };

  const openMaps = async () => {
    if (!order?.address) {
      Alert.alert("No address", "Delivery address is missing.");
      return;
    }
    try {
      const encoded = encodeURIComponent(order.address);
      await Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encoded}`
      );
    } catch {
      Alert.alert("Error", "Could not open Maps.");
    }
  };

  const pillStyle = (status: OrderStatus) => {
    if (status === "NEW") return styles.pillNew;
    if (status === "ACCEPTED") return styles.pillAccepted;
    if (status === "DELIVERED") return styles.pillDelivered;
    return styles.pillCancelled;
  };

  if (!order) {
    return (
      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={{ fontWeight: "800" }}>Order not found.</Text>
            <Pressable style={[styles.btn, { marginTop: 14 }]} onPress={() => router.back()}>
              <Text style={styles.btnText}>Back</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const canAccept = order.status === "NEW";
  const canDeliver = order.status === "ACCEPTED";
  const canCancel = order.status === "NEW" || order.status === "ACCEPTED";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Order Details</Text>

        <Pressable style={styles.smallBtn} onPress={loadOrder} disabled={loading}>
          <Text style={styles.smallText}>{loading ? "..." : "Refresh"}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.section}>Reference</Text>
          <View style={[styles.pill, pillStyle(order.status)]}>
            <Text style={styles.pillText}>{order.status}</Text>
          </View>
        </View>

        <Text style={styles.value}>{order.id}</Text>
        {!!createdLabel && <Text style={styles.subValue}>Date: {createdLabel}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Customer</Text>
        <Text style={styles.value}>{order.customer.fullName}</Text>
        <Text style={styles.value}>{order.customer.phone}</Text>

        <Pressable style={styles.btnOutline} onPress={callCustomer}>
          <Text style={styles.btnOutlineText}>Call Customer</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Delivery</Text>
        <Text style={styles.value}>{order.address}</Text>
        <Text style={styles.subValue}>
          {order.deliveryTime} • {order.payment}
        </Text>

        <Pressable style={styles.btnOutline} onPress={openMaps}>
          <Text style={styles.btnOutlineText}>Open in Maps</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Items</Text>
        {order.items?.length ? (
          order.items.map((item) => (
            <Text key={item.id} style={styles.value}>
              • {item.name} x{item.qty} — ${Number(item.lineTotal).toFixed(2)}
            </Text>
          ))
        ) : (
          <Text style={styles.subValue}>No items found.</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.total}>Total: ${Number(order.total).toFixed(2)}</Text>

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, !canAccept && styles.disabled]}
            disabled={!canAccept || loading}
            onPress={() => setStatus("ACCEPTED")}
          >
            <Text style={styles.actionText}>Accept</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, !canDeliver && styles.disabled]}
            disabled={!canDeliver || loading}
            onPress={() => setStatus("DELIVERED")}
          >
            <Text style={styles.actionText}>Delivered</Text>
          </Pressable>

          <Pressable
            style={[styles.cancelBtn, !canCancel && styles.disabled]}
            disabled={!canCancel || loading}
            onPress={confirmCancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },

  topRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "900", flex: 1 },

  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  section: { fontWeight: "900", fontSize: 16 },
  value: { fontSize: 15, marginTop: 2 },
  subValue: { color: "#666", fontWeight: "700", marginTop: 4 },

  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  pillNew: { backgroundColor: "#111" },
  pillAccepted: { backgroundColor: "#2b6cb0" },
  pillDelivered: { backgroundColor: "#2f855a" },
  pillCancelled: { backgroundColor: "#b91c1c" },

  footer: { paddingTop: 6, gap: 10 },
  total: { fontSize: 20, fontWeight: "900" },

  actionsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionBtn: {
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionText: { color: "#fff", fontWeight: "900" },

  cancelBtn: {
    borderWidth: 1,
    borderColor: "#b91c1c",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  cancelText: { fontWeight: "900", color: "#b91c1c" },

  btn: {
    marginTop: 6,
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "900" },

  btnOutline: {
    borderWidth: 1,
    borderColor: "#111",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnOutlineText: { fontWeight: "900", color: "#111" },

  disabled: { opacity: 0.4 },

  smallBtn: { backgroundColor: "#111", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  smallText: { color: "#fff", fontWeight: "900" },
});