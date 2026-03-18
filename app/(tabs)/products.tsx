import {
  View, Text, StyleSheet, FlatList, Pressable,
  Alert, ActivityIndicator, Platform, Image,
} from "react-native";
import { useMemo, useState, useEffect, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";
import { CartStore } from "../../lib/cartStore";

const TOKEN_KEY = "freshcart_token";
const CUSTOMER_KEY = "freshcart_customer";
const ROLE_KEY = "freshcart_role";
const CUSTOMER_PHONE_KEY = "freshcart_customer_phone";

const CATEGORIES = ["All", "Fruits & Vegetables", "Dairy", "Meat", "Bakery", "Drinks", "Snacks", "Frozen"];

type Product = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  inStock?: boolean;
};

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // ✅ Load cart from storage every time screen focuses
  useFocusEffect(
    useCallback(() => {
      CartStore.getCart().then(setCart);
    }, [])
  );

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/products`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        Alert.alert("Error", data.message || "Could not load products.");
        return;
      }
      const fetched = data.products || [];
      setProducts(fetched);
      await CartStore.setProducts(fetched); // ✅ Save products to store
    } catch {
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All") return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const addToCart = async (id: string) => {
    const updated = { ...cart, [id]: (cart[id] || 0) + 1 };
    setCart(updated);
    await CartStore.setCart(updated); // ✅ Persist immediately
  };

  const removeFromCart = async (id: string) => {
    const updated = { ...cart };
    if (updated[id] > 1) updated[id]--;
    else delete updated[id];
    setCart(updated);
    await CartStore.setCart(updated); // ✅ Persist immediately
  };

  const totalItems = useMemo(() =>
    Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  const totalPrice = useMemo(() =>
    products.reduce((sum, p) => sum + (cart[p.id] || 0) * Number(p.price), 0),
    [cart, products]);

  const openCart = () => {
    // ✅ No need to pass cart as params — cart is in AsyncStorage
    router.push({ pathname: "/(tabs)/cart" });
  };

  const logout = async () => {
    const doLogout = async () => {
      await CartStore.clearCart();
      await storage.multiRemove([TOKEN_KEY, CUSTOMER_KEY, ROLE_KEY, CUSTOMER_PHONE_KEY]);
      router.replace("/(auth)/login");
    };
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to logout?")) doLogout();
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a7a2e" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── HEADER ─── */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>🛒 FreshCart</Text>
        <View style={styles.btnGroup}>
          <Pressable style={styles.cartBtn} onPress={openCart}>
            <Text style={styles.cartBtnText}>🛒 Cart</Text>
            {totalItems > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalItems}</Text>
              </View>
            )}
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {/* ─── CATEGORY FILTER ─── */}
      <View style={styles.categoryWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryContent}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* ─── PRODUCTS ─── */}
      {filteredProducts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No products in this category.</Text>
          <Pressable style={styles.reloadBtn} onPress={() => setSelectedCategory("All")}>
            <Text style={styles.reloadText}>Show All</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
          renderItem={({ item }) => {
            const qty = cart[item.id] || 0;
            return (
              <View style={styles.card}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>🛒</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.category}>{item.category}</Text>
                  <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>
                  {item.inStock === false ? (
                    <Text style={styles.outOfStock}>Out of stock</Text>
                  ) : qty === 0 ? (
                    <Pressable style={styles.addBtn} onPress={() => addToCart(item.id)}>
                      <Text style={styles.addBtnText}>+ Add</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.qtyRow}>
                      <Pressable style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                        <Text style={styles.qtyBtnText}>−</Text>
                      </Pressable>
                      <Text style={styles.qtyNum}>{qty}</Text>
                      <Pressable style={styles.qtyBtn} onPress={() => addToCart(item.id)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ─── CART BAR ─── */}
      {totalItems > 0 && (
        <Pressable style={styles.cartBar} onPress={openCart}>
          <Text style={styles.cartText}>
            🛒 {totalItems} items — ${totalPrice.toFixed(2)} · Tap to checkout
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText: { marginTop: 10, color: "#555", fontWeight: "600" },
  emptyText: { fontSize: 16, color: "#666", fontWeight: "700", marginBottom: 12 },
  reloadBtn: { backgroundColor: "#1a7a2e", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  reloadText: { color: "#fff", fontWeight: "800" },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, paddingTop: 60, paddingBottom: 10,
    backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#eee",
  },
  title: { fontSize: 22, fontWeight: "900" },
  btnGroup: { flexDirection: "row", gap: 8 },
  cartBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1a7a2e", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
  },
  cartBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  badge: { backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { color: "#1a7a2e", fontWeight: "900", fontSize: 11 },
  logoutBtn: { backgroundColor: "#b91c1c", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  logoutText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  categoryWrapper: { backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#eee", height: 52 },
  categoryContent: { paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: "#ddd", marginRight: 8, backgroundColor: "#fff",
  },
  categoryChipActive: { backgroundColor: "#1a7a2e", borderColor: "#1a7a2e" },
  categoryText: { fontSize: 13, fontWeight: "600", color: "#555" },
  categoryTextActive: { color: "#fff" },
  row: { paddingHorizontal: 12, gap: 10, marginBottom: 10 },
  card: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: "#eee", shadowColor: "#000",
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  productImage: { width: "100%", height: 130 },
  imagePlaceholder: { width: "100%", height: 130, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },
  imagePlaceholderText: { fontSize: 40 },
  cardBody: { padding: 10 },
  name: { fontSize: 13, fontWeight: "700", color: "#111", lineHeight: 18 },
  category: { fontSize: 11, color: "#999", marginTop: 2 },
  price: { fontSize: 15, fontWeight: "900", color: "#1a7a2e", marginTop: 4 },
  outOfStock: { marginTop: 6, color: "red", fontWeight: "700", fontSize: 12 },
  addBtn: { marginTop: 8, backgroundColor: "#1a7a2e", borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  qtyRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 8, backgroundColor: "#f0faf0", borderRadius: 8, padding: 4,
  },
  qtyBtn: { backgroundColor: "#1a7a2e", borderRadius: 6, width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  qtyNum: { fontWeight: "900", fontSize: 15, color: "#1a7a2e" },
  cartBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#1a7a2e", padding: 16, alignItems: "center" },
  cartText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});