import {
  View, Text, StyleSheet, FlatList, Pressable,
  Alert, ActivityIndicator, Image,
} from "react-native";
import { useMemo, useState, useCallback } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";
import { CartStore } from "../../lib/cartStore";

const SELECTED_STORE_KEY = "freshcart_selected_store";
const SELECTED_CITY_KEY = "freshcart_selected_city";

const GROCERY_CATEGORIES = [
  "All", "Fruits & Vegetables", "Dairy & Eggs", "Meat & Seafood",
  "Bakery", "Beverages", "Snacks", "Frozen Foods", "Household & Cleaning"
];

const LCBO_CATEGORIES = [
  "All", "Beer & Cider", "Wine", "Whisky & Spirits", "Coolers & RTD"
];

const DOLLARAMA_CATEGORIES = [
  "All", "Snacks", "Beverages", "Household & Cleaning"
];

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
  const params = useLocalSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [storeName, setStoreName] = useState("");
  const [storeId, setStoreId] = useState("");
  const [city, setCity] = useState("");

  // ✅ Get correct categories based on store
  const categories = useMemo(() => {
    if (storeName === "LCBO") return LCBO_CATEGORIES;
    if (storeName === "Dollarama") return DOLLARAMA_CATEGORIES;
    return GROCERY_CATEGORIES;
  }, [storeName]);

  useFocusEffect(useCallback(() => {
    CartStore.getCart().then(setCart);

    const loadStoreInfo = async () => {
      if (params.storeId && params.storeName && params.city) {
        setStoreId(String(params.storeId));
        setStoreName(String(params.storeName));
        setCity(String(params.city));
        setSelectedCategory("All");
        fetchProducts(String(params.storeId));
      } else {
        const stored = await storage.getItem(SELECTED_STORE_KEY);
        const storedCity = await storage.getItem(SELECTED_CITY_KEY);
        if (stored) {
          const store = JSON.parse(stored);
          setStoreId(store.id);
          setStoreName(store.name);
          setCity(storedCity || "");
          setSelectedCategory("All");
          fetchProducts(store.id);
        } else {
          fetchProducts("");
        }
      }
    };
    loadStoreInfo();
  }, [params.storeId]));

  const fetchProducts = async (sid: string) => {
    try {
      setLoading(true);
      const url = sid
        ? `${API_BASE_URL}/products?storeId=${sid}`
        : `${API_BASE_URL}/products`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        Alert.alert("Error", data.message || "Could not load products.");
        return;
      }
      const fetched = data.products || [];
      setProducts(fetched);
      await CartStore.setProducts(fetched);
    } catch {
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All") return products;
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const addToCart = async (id: string) => {
    const updated = { ...cart, [id]: (cart[id] || 0) + 1 };
    setCart(updated);
    await CartStore.setCart(updated);
  };

  const removeFromCart = async (id: string) => {
    const updated = { ...cart };
    if (updated[id] > 1) updated[id]--;
    else delete updated[id];
    setCart(updated);
    await CartStore.setCart(updated);
  };

  const totalItems = useMemo(() =>
    Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  const totalPrice = useMemo(() =>
    products.reduce((sum, p) => sum + (cart[p.id] || 0) * Number(p.price), 0),
    [cart, products]);

  const openCart = () => router.push({ pathname: "/(tabs)/cart" });

  const handleChangeStore = () => {
    if (city) {
      router.push({ pathname: "/(tabs)/stores", params: { city } });
    } else {
      router.push("/(tabs)/");
    }
  };

  // ✅ Store emoji based on store name
  const getStoreEmoji = (name: string) => {
    const emojis: Record<string, string> = {
      "Walmart": "🛒", "No Frills": "🥬", "Metro": "🏙️",
      "LCBO": "🍷", "Dollarama": "💛", "Costco": "🏢",
      "FreshCo": "🛒", "Food Basics": "🛒",
    };
    return emojis[name] || "🏪";
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
      <View style={styles.header}>
        <View style={styles.headerAccentBar} />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandRow}>
              <Text style={styles.brandFresh}>Fresh</Text>
              <Text style={styles.brandCart}>Cart</Text>
            </View>
            {storeName ? (
              <View style={styles.storeInfoRow}>
                <Text style={styles.storeInfoText}>
                  {getStoreEmoji(storeName)} {storeName}
                </Text>
                {city ? <Text style={styles.cityInfoText}> · {city}</Text> : null}
              </View>
            ) : (
              <Text style={styles.headerSub}>Fresh groceries, delivered fast</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {storeName ? (
              <Pressable style={styles.changeStoreBtn} onPress={handleChangeStore}>
                <Text style={styles.changeStoreText}>Change</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.cartBtn} onPress={openCart}>
              <Text style={styles.cartBtnText}>🛒</Text>
              {totalItems > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalItems}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* ─── NO STORE SELECTED BANNER ─── */}
      {!storeName && (
        <Pressable style={styles.noStoreBanner} onPress={() => router.push("/(tabs)/")}>
          <Text style={styles.noStoreBannerText}>
            📍 No store selected — tap to pick your city and store
          </Text>
        </Pressable>
      )}

      {/* ─── LCBO AGE WARNING ─── */}
      {storeName === "LCBO" && (
        <View style={styles.ageWarning}>
          <Text style={styles.ageWarningText}>
            🔞 You must be 19+ to purchase alcohol. Valid ID required at delivery.
          </Text>
        </View>
      )}

      {/* ─── CATEGORY FILTER ─── */}
      <View style={styles.categoryWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
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

      {/* ─── DISCLAIMER ─── */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Prices are approximate and may vary slightly in store. Final price confirmed before delivery.
        </Text>
      </View>

      {/* ─── PRODUCTS ─── */}
      {filteredProducts.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>🔍</Text>
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
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>
                      {storeName === "LCBO" ? "🍷" : "🛒"}
                    </Text>
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
          <Text style={styles.cartBarText}>
            🛒 {totalItems} item{totalItems !== 1 ? "s" : ""} — ${totalPrice.toFixed(2)}
          </Text>
          <Text style={styles.cartBarSub}>Tap to checkout →</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText: { marginTop: 10, color: "#555", fontWeight: "600" },
  emptyText: { fontSize: 16, color: "#666", fontWeight: "700", marginBottom: 12 },
  reloadBtn: {
    backgroundColor: "#f5c518", paddingVertical: 10,
    paddingHorizontal: 18, borderRadius: 10,
  },
  reloadText: { color: "#111", fontWeight: "800" },
  header: {
    backgroundColor: "#1a7a2e", paddingTop: 60, paddingBottom: 16,
    paddingHorizontal: 20, overflow: "hidden",
  },
  headerAccentBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 5, backgroundColor: "#f5c518",
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandRow: { flexDirection: "row", alignItems: "baseline", gap: 1 },
  brandFresh: { fontSize: 24, fontWeight: "900", color: "#fff" },
  brandCart: { fontSize: 24, fontWeight: "900", color: "#f5c518" },
  headerSub: { fontSize: 12, color: "#a7f3d0", fontWeight: "500", marginTop: 2 },
  storeInfoRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  storeInfoText: { fontSize: 12, color: "#f5c518", fontWeight: "800" },
  cityInfoText: { fontSize: 12, color: "#a7f3d0", fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  changeStoreBtn: {
    backgroundColor: "rgba(255,255,255,0.2)", paddingVertical: 6,
    paddingHorizontal: 12, borderRadius: 20,
  },
  changeStoreText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  cartBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#f5c518", alignItems: "center",
    justifyContent: "center", position: "relative",
  },
  cartBtnText: { fontSize: 22 },
  badge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: "#ef4444", borderRadius: 999,
    paddingHorizontal: 5, paddingVertical: 1,
    borderWidth: 2, borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 10 },
  noStoreBanner: {
    backgroundColor: "#fffbeb", padding: 12,
    borderBottomWidth: 1, borderColor: "#f5c518",
  },
  noStoreBannerText: {
    color: "#92400e", fontWeight: "700", fontSize: 13, textAlign: "center",
  },
  ageWarning: {
    backgroundColor: "#fef2f2", padding: 10,
    borderBottomWidth: 1, borderColor: "#fca5a5",
  },
  ageWarningText: {
    color: "#dc2626", fontWeight: "700", fontSize: 12, textAlign: "center",
  },
  categoryWrapper: {
    backgroundColor: "#fff", borderBottomWidth: 1,
    borderColor: "#f0f0f0", height: 52,
  },
  categoryContent: { paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#e8e8e8", marginRight: 8, backgroundColor: "#fff",
  },
  categoryChipActive: { backgroundColor: "#f5c518", borderColor: "#f5c518" },
  categoryText: { fontSize: 13, fontWeight: "600", color: "#555" },
  categoryTextActive: { color: "#111", fontWeight: "800" },
  disclaimer: {
    backgroundColor: "#fffbeb", borderBottomWidth: 1, borderColor: "#fcd34d",
    paddingHorizontal: 14, paddingVertical: 8,
  },
  disclaimerText: { fontSize: 11, color: "#92400e", fontWeight: "600", textAlign: "center" },
  row: { paddingHorizontal: 12, gap: 10, marginBottom: 10 },
  card: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: "#eee", shadowColor: "#000",
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderBottomWidth: 3, borderBottomColor: "#f5c518",
  },
  productImage: { width: "100%", height: 130 },
  imagePlaceholder: {
    width: "100%", height: 130, backgroundColor: "#f0faf4",
    alignItems: "center", justifyContent: "center",
  },
  imagePlaceholderText: { fontSize: 40 },
  cardBody: { padding: 10 },
  name: { fontSize: 13, fontWeight: "700", color: "#111", lineHeight: 18 },
  category: { fontSize: 11, color: "#999", marginTop: 2 },
  price: { fontSize: 15, fontWeight: "900", color: "#1a7a2e", marginTop: 4 },
  outOfStock: { marginTop: 6, color: "#ef4444", fontWeight: "700", fontSize: 12 },
  addBtn: {
    marginTop: 8, backgroundColor: "#1a7a2e",
    borderRadius: 8, paddingVertical: 7, alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  qtyRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 8, backgroundColor: "#f0faf4", borderRadius: 8, padding: 4,
  },
  qtyBtn: {
    backgroundColor: "#1a7a2e", borderRadius: 6,
    width: 28, height: 28, alignItems: "center", justifyContent: "center",
  },
  qtyBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  qtyNum: { fontWeight: "900", fontSize: 15, color: "#1a7a2e" },
  cartBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#1a7a2e", padding: 14, alignItems: "center",
    borderTopWidth: 3, borderTopColor: "#f5c518",
  },
  cartBarText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  cartBarSub: { color: "#f5c518", fontWeight: "700", fontSize: 12, marginTop: 2 },
});