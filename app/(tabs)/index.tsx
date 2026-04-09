import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { storage } from "../../lib/storage";

const CUSTOMER_KEY = "freshcart_customer";
const SELECTED_CITY_KEY = "freshcart_selected_city";

function getPhotoKey(userId: string) {
  return `freshcart_profile_photo_${userId}`;
}

const CITIES = [
  { name: "Toronto", emoji: "🏙️", desc: "All M postal codes" },
  { name: "Oshawa", emoji: "🏘️", desc: "L1G, L1H, L1J, L1K, L1L" },
  { name: "Barrie", emoji: "🌲", desc: "L4M, L4N, L9J" },
];

export default function HomeScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const stored = await storage.getItem(CUSTOMER_KEY);
        if (stored) {
          const user = JSON.parse(stored);
          const userId = user?.id || user?.userId || "";
          setUserName(user?.name || "");
          if (userId) {
            const saved = await storage.getItem(getPhotoKey(userId));
            setPhotoUri(saved || null);
          } else {
            setPhotoUri(null);
          }
        } else {
          setPhotoUri(null);
        }

        // Load previously selected city
        const city = await storage.getItem(SELECTED_CITY_KEY);
        if (city) setSelectedCity(city);
      })();
    }, [])
  );

  const handleCitySelect = async (city: string) => {
    setSelectedCity(city);
    await storage.setItem(SELECTED_CITY_KEY, city);
    // Navigate to store selection
    router.push({
      pathname: "/(tabs)/stores",
      params: { city },
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── TOP BAR ─── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.logoWrap}>
            <Text style={styles.topBarLogo}>🛒</Text>
          </View>
          <Pressable onLongPress={() => router.push("/admin/login")} delayLongPress={800}>
            <View style={styles.brandRow}>
              <Text style={styles.brandFresh}>Fresh</Text>
              <Text style={styles.brandCart}>Cart</Text>
            </View>
          </Pressable>
        </View>
        <Pressable style={styles.profileBtn} onPress={() => router.push("/(tabs)/profile")}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.profileImage} />
          ) : (
            <Text style={styles.profileIcon}>👤</Text>
          )}
        </Pressable>
      </View>

      {/* ─── WELCOME ─── */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>
          {userName ? `Hey ${userName.split(" ")[0]}! 👋` : "Welcome to FreshCart! 👋"}
        </Text>
        <Text style={styles.welcomeSub}>Where are you shopping today?</Text>
      </View>

      {/* ─── CITY PICKER ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Select Your City</Text>
        <Text style={styles.sectionSub}>We deliver fresh groceries to your door</Text>
        <View style={styles.citiesGrid}>
          {CITIES.map((city) => {
            const active = selectedCity === city.name;
            return (
              <Pressable
                key={city.name}
                style={[styles.cityCard, active && styles.cityCardActive]}
                onPress={() => handleCitySelect(city.name)}
              >
                <View style={[styles.cityIconWrap, active && styles.cityIconWrapActive]}>
                  <Text style={styles.cityEmoji}>{city.emoji}</Text>
                </View>
                <Text style={[styles.cityName, active && styles.cityNameActive]}>
                  {city.name}
                </Text>
                <Text style={styles.cityDesc}>{city.desc}</Text>
                {active && (
                  <View style={styles.cityCheck}>
                    <Text style={styles.cityCheckText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ─── FEATURES ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why FreshCart?</Text>
        <View style={styles.featuresRow}>
          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>⚡</Text>
            <Text style={styles.featureTitle}>Fast</Text>
            <Text style={styles.featureSub}>30-45 min delivery</Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>🏪</Text>
            <Text style={styles.featureTitle}>Multi-Store</Text>
            <Text style={styles.featureSub}>Walmart, Metro & more</Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureEmoji}>🎉</Text>
            <Text style={styles.featureTitle}>Free</Text>
            <Text style={styles.featureSub}>First order free</Text>
          </View>
        </View>
      </View>

      {/* ─── QUICK ACTIONS ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Pressable style={styles.actionBtn} onPress={() => router.push("/(tabs)/orders")}>
          <Text style={styles.actionBtnEmoji}>📦</Text>
          <Text style={styles.actionBtnText}>Track My Orders</Text>
          <Text style={styles.actionBtnArrow}>→</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { marginTop: 10 }]} onPress={() => router.push("/(tabs)/explore")}>
          <Text style={styles.actionBtnEmoji}>🔍</Text>
          <Text style={styles.actionBtnText}>Explore FreshCart</Text>
          <Text style={styles.actionBtnArrow}>→</Text>
        </Pressable>
      </View>

      {/* ─── FOOTER BANNER ─── */}
      <View style={styles.zoneBanner}>
        <Text style={styles.zoneText}>📍 Delivering to Toronto, Oshawa & Barrie</Text>
      </View>

      <View style={{ height: 20 }} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f5" },
  topBar: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a7a2e",
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#f5c518",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#f5c518", shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  topBarLogo: { fontSize: 22 },
  brandRow: { flexDirection: "row", alignItems: "baseline", gap: 1 },
  brandFresh: { fontSize: 22, fontWeight: "900", color: "#fff" },
  brandCart: { fontSize: 22, fontWeight: "900", color: "#f5c518" },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  profileImage: { width: 40, height: 40, borderRadius: 20 },
  profileIcon: { fontSize: 20 },
  welcomeSection: {
    backgroundColor: "#1a7a2e", paddingHorizontal: 20,
    paddingBottom: 24, paddingTop: 4,
  },
  welcomeText: { fontSize: 22, fontWeight: "900", color: "#fff" },
  welcomeSub: { fontSize: 14, color: "#a7f3d0", fontWeight: "600", marginTop: 4 },
  section: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderBottomWidth: 3, borderBottomColor: "#f5c518",
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111", marginBottom: 4 },
  sectionSub: { fontSize: 12, color: "#999", fontWeight: "500", marginBottom: 16 },
  citiesGrid: { flexDirection: "row", gap: 10 },
  cityCard: {
    flex: 1, backgroundColor: "#f9fafb", borderRadius: 14,
    padding: 14, alignItems: "center", gap: 6,
    borderWidth: 2, borderColor: "#e8e8e8",
    position: "relative",
  },
  cityCardActive: {
    borderColor: "#f5c518", backgroundColor: "#fffbeb",
  },
  cityIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#f0faf4", alignItems: "center",
    justifyContent: "center",
  },
  cityIconWrapActive: { backgroundColor: "#f5c518" },
  cityEmoji: { fontSize: 26 },
  cityName: { fontSize: 14, fontWeight: "900", color: "#111" },
  cityNameActive: { color: "#1a7a2e" },
  cityDesc: { fontSize: 9, color: "#888", textAlign: "center", fontWeight: "600" },
  cityCheck: {
    position: "absolute", top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#f5c518", alignItems: "center", justifyContent: "center",
  },
  cityCheckText: { color: "#111", fontSize: 10, fontWeight: "900" },
  featuresRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  featureCard: {
    flex: 1, backgroundColor: "#f9fafb", borderRadius: 12,
    padding: 12, alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#eee",
  },
  featureEmoji: { fontSize: 24 },
  featureTitle: { fontSize: 12, fontWeight: "900", color: "#111" },
  featureSub: { fontSize: 9, color: "#888", textAlign: "center", fontWeight: "600" },
  actionBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f9fafb", borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: "#eee", gap: 12,
  },
  actionBtnEmoji: { fontSize: 22 },
  actionBtnText: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111" },
  actionBtnArrow: { fontSize: 16, color: "#f5c518", fontWeight: "900" },
  zoneBanner: {
    backgroundColor: "#1a7a2e", marginHorizontal: 16, marginTop: 16,
    borderRadius: 12, padding: 12, alignItems: "center",
  },
  zoneText: { color: "#f5c518", fontWeight: "800", fontSize: 13 },
});