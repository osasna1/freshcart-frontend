import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, Pressable,
  ScrollView, ActivityIndicator, Image, Alert,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";
import { CartStore } from "../../lib/cartStore";

const SELECTED_STORE_KEY = "freshcart_selected_store";
const SELECTED_CITY_KEY = "freshcart_selected_city";

const STORE_LOGOS: Record<string, any> = {
  walmart: require("../../assets/images/walmart.png"),
  nofrills: require("../../assets/images/nofrills.png"),
  metro: require("../../assets/images/metro.png"),
  lcbo: require("../../assets/images/lcbo.png"),
  dollarama: require("../../assets/images/dollarama.png"),
  costco: require("../../assets/images/costco.png"),
  freshco: require("../../assets/images/freshco.png"),
  foodbasic: require("../../assets/images/foodbasic.png"),
};

const STORE_EMOJIS: Record<string, string> = {
  Walmart: "🛒",
  "No Frills": "🥬",
  Metro: "🏙️",
  LCBO: "🍷",
  Dollarama: "💛",
  Costco: "🏢",
  FreshCo: "🛒",
  "Food Basics": "🛒",
};

export default function StoresScreen() {
  const params = useLocalSearchParams();
  const city = String(params.city || "");

  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadStores();
    }, [city])
  );

  const loadStores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/stores?city=${city}`);
      const data = await res.json();
      if (data.ok) setStores(data.stores);

      const stored = await storage.getItem(SELECTED_STORE_KEY);
      if (stored) setSelectedStore(JSON.parse(stored));
    } catch {}
    finally { setLoading(false); }
  };

  const handleStoreSelect = async (store: any) => {
    // ✅ If switching stores and cart has items, warn the customer
    const currentCart = await CartStore.getCart();
    const cartItemCount = Object.keys(currentCart).length;
    const isSameStore = selectedStore?.id === store.id;

    if (cartItemCount > 0 && !isSameStore) {
      Alert.alert(
        "Switch Store?",
        `You have items in your cart from ${selectedStore?.name || "another store"}. Switching to ${store.name} will clear your cart.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Switch & Clear Cart",
            style: "destructive",
            onPress: async () => {
              await CartStore.clearCart(); // ✅ Clear cart
              await storage.setItem(SELECTED_STORE_KEY, JSON.stringify(store));
              await storage.setItem(SELECTED_CITY_KEY, city);
              setSelectedStore(store);
              router.push({
                pathname: "/(tabs)/products",
                params: { storeId: store.id, storeName: store.name, city },
              });
            },
          },
        ]
      );
    } else {
      // ✅ No items in cart or same store — just navigate
      await CartStore.clearCart();
      await storage.setItem(SELECTED_STORE_KEY, JSON.stringify(store));
      await storage.setItem(SELECTED_CITY_KEY, city);
      setSelectedStore(store);
      router.push({
        pathname: "/(tabs)/products",
        params: { storeId: store.id, storeName: store.name, city },
      });
    }
  };

  const getStoreLogo = (logoKey: string) => {
    if (!logoKey) return null;
    const key = logoKey.toLowerCase().replace(/\s/g, "").replace("_", "");
    return STORE_LOGOS[key] || null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a7a2e" />
        <Text style={styles.loadingText}>Loading stores...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerAccentBar} />
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Choose a Store</Text>
          <Text style={styles.headerSub}>📍 {city}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* ─── INTRO ─── */}
      <View style={styles.introBox}>
        <Text style={styles.introText}>
          Select a store in {city} and we will shop your groceries and deliver them to your door!
        </Text>
      </View>

      {/* ─── STORES GRID ─── */}
      <View style={styles.storesSection}>
        <Text style={styles.storesSectionTitle}>
          {stores.length} stores available in {city}
        </Text>
        <View style={styles.storesGrid}>
          {stores.map((store) => {
            const active = selectedStore?.id === store.id;
            const logo = getStoreLogo(store.logo || store.name);
            return (
              <Pressable
                key={store.id}
                style={[styles.storeCard, active && styles.storeCardActive]}
                onPress={() => handleStoreSelect(store)}
              >
                {active && (
                  <View style={styles.storeCheck}>
                    <Text style={styles.storeCheckText}>✓</Text>
                  </View>
                )}
                <View style={[styles.storeLogoWrap, active && styles.storeLogoWrapActive]}>
                  {logo ? (
                    <Image source={logo} style={styles.storeLogo} resizeMode="contain" />
                  ) : (
                    <Text style={styles.storeEmoji}>
                      {STORE_EMOJIS[store.name] || "🏪"}
                    </Text>
                  )}
                </View>
                <Text style={[styles.storeName, active && styles.storeNameActive]}>
                  {store.name}
                </Text>
                <Text style={styles.storeCity}>{store.city}</Text>
                <View style={[styles.shopNowBtn, active && styles.shopNowBtnActive]}>
                  <Text style={[styles.shopNowText, active && styles.shopNowTextActive]}>
                    {active ? "Selected ✓" : "Shop Here"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ─── INFO BANNER ─── */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerTitle}>How it works</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoStep}>1</Text>
          <Text style={styles.infoText}>Pick your store</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoStep}>2</Text>
          <Text style={styles.infoText}>Browse and add products to cart</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoStep}>3</Text>
          <Text style={styles.infoText}>We shop and deliver to your door</Text>
        </View>
      </View>

      <View style={{ height: 30 }} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f5" },
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", gap: 12,
  },
  loadingText: { color: "#666", fontWeight: "600" },
  header: {
    backgroundColor: "#1a7a2e", paddingTop: 60, paddingBottom: 20,
    paddingHorizontal: 20, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    overflow: "hidden",
  },
  headerAccentBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 5, backgroundColor: "#f5c518",
  },
  backBtn: {
    backgroundColor: "#f5c518", paddingVertical: 6,
    paddingHorizontal: 12, borderRadius: 20, width: 60,
  },
  backText: { color: "#111", fontWeight: "900", fontSize: 13 },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#fff" },
  headerSub: { fontSize: 12, color: "#a7f3d0", fontWeight: "600", marginTop: 2 },
  introBox: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 14, borderBottomWidth: 3,
    borderBottomColor: "#f5c518",
  },
  introText: { fontSize: 14, color: "#555", fontWeight: "600", lineHeight: 20, textAlign: "center" },
  storesSection: { marginHorizontal: 16, marginTop: 16 },
  storesSectionTitle: {
    fontSize: 13, color: "#999", fontWeight: "700", marginBottom: 12,
  },
  storesGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12,
  },
  storeCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 16,
    padding: 16, alignItems: "center", gap: 8,
    borderWidth: 2, borderColor: "#e8e8e8",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    position: "relative",
  },
  storeCardActive: {
    borderColor: "#f5c518", backgroundColor: "#fffbeb",
  },
  storeCheck: {
    position: "absolute", top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#f5c518", alignItems: "center", justifyContent: "center",
  },
  storeCheckText: { color: "#111", fontSize: 11, fontWeight: "900" },
  storeLogoWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: "#f9fafb", alignItems: "center",
    justifyContent: "center", borderWidth: 1, borderColor: "#eee",
  },
  storeLogoWrapActive: { borderColor: "#f5c518", backgroundColor: "#fff" },
  storeLogo: { width: 52, height: 52, borderRadius: 10 },
  storeEmoji: { fontSize: 32 },
  storeName: { fontSize: 14, fontWeight: "900", color: "#111", textAlign: "center" },
  storeNameActive: { color: "#1a7a2e" },
  storeCity: { fontSize: 11, color: "#999", fontWeight: "600" },
  shopNowBtn: {
    backgroundColor: "#f0faf4", borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 16,
    borderWidth: 1, borderColor: "#d1fae5",
  },
  shopNowBtnActive: { backgroundColor: "#f5c518", borderColor: "#f5c518" },
  shopNowText: { fontSize: 12, fontWeight: "800", color: "#1a7a2e" },
  shopNowTextActive: { color: "#111" },
  infoBanner: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 16,
    borderBottomWidth: 3, borderBottomColor: "#f5c518",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  infoBannerTitle: { fontSize: 15, fontWeight: "900", color: "#111", marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  infoStep: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#f5c518", textAlign: "center",
    lineHeight: 28, fontWeight: "900", fontSize: 14, color: "#111",
    overflow: "hidden",
  },
  infoText: { fontSize: 14, color: "#555", fontWeight: "600", flex: 1 },
});