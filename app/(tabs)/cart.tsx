import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { useMemo, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { CartStore } from "../../lib/cartStore";
import { storage } from "../../lib/storage";
import { API_BASE_URL } from "../../lib/api";

const SERVICE_FEE = 2.99;
const TOKEN_KEY = "freshcart_token";

export default function CartScreen() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<any[]>([]);
  const [isFirstOrder, setIsFirstOrder] = useState(false);

  useFocusEffect(
    useCallback(() => {
      CartStore.getCart().then(setCart);
      CartStore.getProducts().then(setProducts);
      checkFirstOrder();
    }, [])
  );

  // ✅ Check if this is the customer's first order
  const checkFirstOrder = async () => {
    try {
      const token = await storage.getItem(TOKEN_KEY);
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/orders/check-first`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setIsFirstOrder(data.isFirstOrder);
    } catch {}
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const p = products.find((x: any) => String(x.id) === String(id));
        if (!p) return null;
        return { ...p, qty, lineTotal: Number(p.price) * Number(qty) };
      })
      .filter(Boolean) as any[];
  }, [cart, products]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems]
  );

  // ✅ First order = free delivery
  const deliveryFee = isFirstOrder ? 0 : (subtotal >= 50 ? 0 : 5);
  const grandTotal = subtotal + deliveryFee + SERVICE_FEE;

  const updateCart = async (updated: Record<string, number>) => {
    setCart(updated);
    await CartStore.setCart(updated);
  };

  const inc = (id: string) => updateCart({ ...cart, [id]: (cart[id] || 0) + 1 });

  const dec = (id: string) => {
    const updated = { ...cart };
    if (updated[id] <= 1) delete updated[id];
    else updated[id]--;
    updateCart(updated);
  };

  const removeItem = (id: string) => {
    Alert.alert("Remove item?", "Do you want to remove this item from your cart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: () => {
          const updated = { ...cart };
          delete updated[id];
          updateCart(updated);
        },
      },
    ]);
  };

  const goBackToProducts = () => router.replace("/(tabs)/products");

  const checkout = () => {
    router.push({
      pathname: "/checkout",
      params: {
        cart: JSON.stringify(cart),
        products: JSON.stringify(products),
      },
    });
  };

  // ─── EMPTY STATE ───
  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.header}>
          <View style={styles.headerAccentBar} />
          <Text style={styles.headerTitle}>Your Cart</Text>
        </View>
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add some fresh groceries to get started!</Text>
          <Pressable style={styles.shopBtn} onPress={goBackToProducts}>
            <Text style={styles.shopBtnText}>Browse Products</Text>
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
            <Text style={styles.headerTitle}>Your Cart</Text>
            <Text style={styles.headerSub}>{cartItems.length} item{cartItems.length !== 1 ? "s" : ""} ready to order</Text>
          </View>
          <Pressable style={styles.backTopBtn} onPress={goBackToProducts}>
            <Text style={styles.backTopText}>← Shop</Text>
          </Pressable>
        </View>
      </View>

      {/* ✅ First Order Banner */}
      {isFirstOrder && (
        <View style={styles.firstOrderBanner}>
          <Text style={styles.firstOrderText}>🎉 Free delivery on your first order!</Text>
        </View>
      )}

      {/* ─── ITEMS LIST ─── */}
      <FlatList
        data={cartItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardYellowBar} />
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Pressable style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)} each</Text>
              <View style={styles.cardBottom}>
                <View style={styles.qtyBox}>
                  <Pressable style={styles.qtyBtn} onPress={() => dec(item.id)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.qtyNum}>{item.qty}</Text>
                  <Pressable style={styles.qtyBtn} onPress={() => inc(item.id)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                </View>
                <View style={styles.lineTotalBadge}>
                  <Text style={styles.lineTotalText}>${Number(item.lineTotal).toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* ─── FOOTER ─── */}
      <View style={styles.footer}>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, deliveryFee === 0 && styles.freeDelivery]}>
              {deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}
            </Text>
          </View>
          {isFirstOrder && (
            <Text style={styles.freeNote}>🎉 Free delivery on your first order!</Text>
          )}
          {!isFirstOrder && subtotal >= 50 && (
            <Text style={styles.freeNote}>Free delivery on orders over $50!</Text>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>${SERVICE_FEE.toFixed(2)}</Text>
          </View>
          <Text style={styles.serviceFeeNote}>Covers payment processing and app maintenance</Text>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        <Pressable style={styles.checkoutBtn} onPress={checkout}>
          <Text style={styles.checkoutText}>Proceed to Checkout →</Text>
          <Text style={styles.checkoutSub}>${grandTotal.toFixed(2)} total</Text>
        </Pressable>

        <Pressable style={styles.continueShopping} onPress={goBackToProducts}>
          <Text style={styles.continueText}>+ Add more items</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f5" },
  emptyContainer: { flex: 1, backgroundColor: "#f4f7f5" },
  emptyContent: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12,
  },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 3, borderColor: "#f5c518",
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 24, fontWeight: "900", color: "#111" },
  emptySubtitle: { fontSize: 15, color: "#666", textAlign: "center", fontWeight: "600" },
  shopBtn: {
    backgroundColor: "#f5c518", paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, marginTop: 8,
    shadowColor: "#f5c518", shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  shopBtnText: { color: "#111", fontWeight: "900", fontSize: 16 },
  header: {
    backgroundColor: "#1a7a2e", paddingTop: 60, paddingBottom: 20,
    paddingHorizontal: 20, overflow: "hidden",
  },
  headerAccentBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 5, backgroundColor: "#f5c518",
  },
  headerRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  headerTitle: { fontSize: 26, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 13, color: "#a7f3d0", fontWeight: "600", marginTop: 2 },
  backTopBtn: {
    backgroundColor: "#f5c518", paddingVertical: 8,
    paddingHorizontal: 14, borderRadius: 20,
  },
  backTopText: { color: "#111", fontWeight: "900", fontSize: 13 },
  firstOrderBanner: {
    backgroundColor: "#dcfce7", padding: 12,
    borderBottomWidth: 1, borderColor: "#16a34a",
    alignItems: "center",
  },
  firstOrderText: { color: "#16a34a", fontWeight: "900", fontSize: 14 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, marginTop: 12,
    flexDirection: "row", overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderBottomWidth: 3, borderBottomColor: "#f5c518",
  },
  cardYellowBar: { width: 5, backgroundColor: "#f5c518" },
  cardContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  itemName: { fontSize: 15, fontWeight: "900", color: "#111", flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 13, color: "#888", fontWeight: "600", marginTop: 4 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  removeBtnText: { color: "#ef4444", fontWeight: "900", fontSize: 12 },
  qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0faf4", borderRadius: 10, overflow: "hidden" },
  qtyBtn: { width: 36, height: 36, backgroundColor: "#1a7a2e", alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  qtyNum: { minWidth: 36, textAlign: "center", fontWeight: "900", fontSize: 16, color: "#1a7a2e" },
  lineTotalBadge: {
    backgroundColor: "#fffbeb", borderRadius: 10, paddingVertical: 6,
    paddingHorizontal: 12, borderWidth: 1, borderColor: "#f5c518",
  },
  lineTotalText: { fontWeight: "900", color: "#1a7a2e", fontSize: 15 },
  footer: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, shadowColor: "#000", shadowOpacity: 0.08,
    shadowRadius: 12, elevation: 8, borderTopWidth: 3, borderTopColor: "#f5c518",
  },
  summaryBox: { backgroundColor: "#f0faf4", borderRadius: 14, padding: 14, marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { color: "#555", fontWeight: "700", fontSize: 14 },
  summaryValue: { color: "#111", fontWeight: "700", fontSize: 14 },
  freeDelivery: { color: "#1a7a2e", fontWeight: "900" },
  freeNote: { color: "#1a7a2e", fontSize: 12, fontWeight: "700", marginBottom: 8 },
  serviceFeeNote: { color: "#999", fontSize: 11, fontWeight: "500", marginBottom: 8, marginTop: -4 },
  totalRow: { borderTopWidth: 1, borderTopColor: "#d1fae5", paddingTop: 10, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontSize: 17, fontWeight: "900", color: "#111" },
  totalValue: { fontSize: 17, fontWeight: "900", color: "#1a7a2e" },
  checkoutBtn: {
    backgroundColor: "#1a7a2e", borderRadius: 16, paddingVertical: 16,
    alignItems: "center", marginBottom: 10,
    shadowColor: "#1a7a2e", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  checkoutText: { color: "#fff", fontWeight: "900", fontSize: 17 },
  checkoutSub: { color: "#a7f3d0", fontSize: 12, fontWeight: "700", marginTop: 2 },
  continueShopping: { alignItems: "center", paddingVertical: 8 },
  continueText: { color: "#1a7a2e", fontWeight: "800", fontSize: 14 },
});