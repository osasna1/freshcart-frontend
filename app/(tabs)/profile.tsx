import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, Pressable,
  ScrollView, Alert, ActivityIndicator, Image, Linking,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { storage } from "../../lib/storage";
import { API_BASE_URL } from "../../lib/api";
import { CartStore } from "../../lib/cartStore";

const TOKEN_KEY = "freshcart_token";
const CUSTOMER_KEY = "freshcart_customer";
const ROLE_KEY = "freshcart_role";
const SELECTED_STORE_KEY = "freshcart_selected_store";
const SELECTED_CITY_KEY = "freshcart_selected_city";

function getPhotoKey(userId: string) {
  return `freshcart_profile_photo_${userId}`;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string>("");
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const stored = await storage.getItem(CUSTOMER_KEY);
      let currentUser = null;
      let currentUserId = "";

      if (stored) {
        currentUser = JSON.parse(stored);
        currentUserId = currentUser?.id || currentUser?.userId || "";
        setUser(currentUser);
        setUserId(currentUserId);
      }

      if (currentUserId) {
        const savedPhoto = await storage.getItem(getPhotoKey(currentUserId));
        setPhotoUri(savedPhoto || null);
      }

      const token = await storage.getItem(TOKEN_KEY);
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setOrderCount(data.orders.length);
        setIsFirstOrder(data.orders.length === 0);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const handlePickPhoto = async () => {
    Alert.alert(
      "Profile Photo",
      "Choose a photo source",
      [
        {
          text: "📷 Camera",
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Permission needed", "Please allow camera access.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true, aspect: [1, 1], quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              setPhotoUri(uri);
              if (userId) await storage.setItem(getPhotoKey(userId), uri);
            }
          },
        },
        {
          text: "🖼️ Photo Library",
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Permission needed", "Please allow photo library access.");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true, aspect: [1, 1], quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              const uri = result.assets[0].uri;
              setPhotoUri(uri);
              if (userId) await storage.setItem(getPhotoKey(userId), uri);
            }
          },
        },
        {
          text: "🗑️ Remove Photo",
          style: "destructive",
          onPress: async () => {
            setPhotoUri(null);
            if (userId) await storage.removeItem(getPhotoKey(userId));
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await CartStore.clearCart();
          await storage.multiRemove([
            TOKEN_KEY,
            CUSTOMER_KEY,
            ROLE_KEY,
            SELECTED_STORE_KEY,
            SELECTED_CITY_KEY,
          ]);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will open our account deletion page in your browser. You can submit your deletion request there.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            Linking.openURL("https://freshcartcanada.ca/pages/delete-account.html");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a7a2e" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerAccentBar} />
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* ─── AVATAR & NAME ─── */}
      <View style={styles.avatarSection}>
        <Pressable style={styles.avatarWrap} onPress={handlePickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          )}
          <View style={styles.cameraBtn}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        </Pressable>
        <Text style={styles.tapText}>Tap to change photo</Text>
        <Text style={styles.userName}>{user?.name || "Customer"}</Text>
        <Text style={styles.userPhone}>📱 {user?.phone || "N/A"}</Text>
        {isFirstOrder && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>🎉 Free delivery on your first order!</Text>
          </View>
        )}
      </View>

      {/* ─── STATS ─── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{orderCount}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{isFirstOrder ? "🎁" : "✅"}</Text>
          <Text style={styles.statLabel}>{isFirstOrder ? "First Order Free" : "Active Customer"}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>🛒</Text>
          <Text style={styles.statLabel}>FreshCart Member</Text>
        </View>
      </View>

      {/* ─── INFO CARD ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>👤</Text>
          <View>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{user?.name || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📱</Text>
          <View>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{user?.phone || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🏷️</Text>
          <View>
            <Text style={styles.infoLabel}>Account Type</Text>
            <Text style={styles.infoValue}>Customer</Text>
          </View>
        </View>
      </View>

      {/* ─── QUICK ACTIONS ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <Pressable style={styles.actionRow} onPress={() => router.push("/(tabs)/orders")}>
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionText}>My Orders</Text>
          <Text style={styles.actionArrow}>→</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.actionRow} onPress={() => router.push("/(tabs)/")}>
          <Text style={styles.actionIcon}>🛒</Text>
          <Text style={styles.actionText}>Start Shopping</Text>
          <Text style={styles.actionArrow}>→</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.actionRow} onPress={() => router.push("/(tabs)/explore")}>
          <Text style={styles.actionIcon}>🔍</Text>
          <Text style={styles.actionText}>Explore</Text>
          <Text style={styles.actionArrow}>→</Text>
        </Pressable>
      </View>

      {/* ─── DELIVERY ZONES ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Zones</Text>
        <View style={styles.zoneBox}>
          <View style={styles.zoneRow}>
            <Text style={styles.zoneEmoji}>🏙️</Text>
            <View>
              <Text style={styles.zoneCity}>Toronto</Text>
              <Text style={styles.zoneDetail}>All M postal codes</Text>
            </View>
          </View>
          <View style={styles.zoneDivider} />
          <View style={styles.zoneRow}>
            <Text style={styles.zoneEmoji}>🏘️</Text>
            <View>
              <Text style={styles.zoneCity}>Oshawa</Text>
              <Text style={styles.zoneDetail}>L1G, L1H, L1J, L1K, L1L</Text>
            </View>
          </View>
          <View style={styles.zoneDivider} />
          <View style={styles.zoneRow}>
            <Text style={styles.zoneEmoji}>🌲</Text>
            <View>
              <Text style={styles.zoneCity}>Barrie</Text>
              <Text style={styles.zoneDetail}>L4M, L4N, L9J</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ─── DELETE ACCOUNT ─── */}
      <Pressable style={styles.deleteBtn} onPress={handleDeleteAccount}>
        <Text style={styles.deleteText}>🗑️ Delete Account</Text>
      </Pressable>

      {/* ─── LOGOUT ─── */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </Pressable>

      <Text style={styles.footer}>
        FreshCart — Toronto, Oshawa & Barrie Grocery Delivery
      </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { backgroundColor: "#f4f7f5", paddingBottom: 40 },
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
    paddingHorizontal: 12, borderRadius: 20,
  },
  backText: { color: "#111", fontWeight: "900", fontSize: 13 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
  avatarSection: {
    alignItems: "center", paddingVertical: 28,
    backgroundColor: "#fff", marginBottom: 4,
    borderBottomWidth: 3, borderBottomColor: "#f5c518",
  },
  avatarWrap: { position: "relative", marginBottom: 8 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#fffbeb", borderWidth: 3, borderColor: "#f5c518",
    alignItems: "center", justifyContent: "center",
  },
  avatarImage: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: "#f5c518",
  },
  avatarEmoji: { fontSize: 48 },
  cameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#f5c518", alignItems: "center",
    justifyContent: "center", borderWidth: 2, borderColor: "#fff",
  },
  cameraIcon: { fontSize: 14 },
  tapText: { fontSize: 11, color: "#999", marginBottom: 10, fontWeight: "500" },
  userName: { fontSize: 22, fontWeight: "900", color: "#111", marginBottom: 4 },
  userPhone: { fontSize: 14, color: "#666", fontWeight: "600" },
  newBadge: {
    backgroundColor: "#fffbeb", borderRadius: 20, paddingVertical: 6,
    paddingHorizontal: 14, marginTop: 10, borderWidth: 1, borderColor: "#f5c518",
  },
  newBadgeText: { color: "#92400e", fontWeight: "700", fontSize: 12 },
  statsRow: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, marginVertical: 16,
  },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14,
    alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04,
    shadowRadius: 6, elevation: 2,
    borderBottomWidth: 3, borderBottomColor: "#f5c518",
  },
  statNumber: { fontSize: 22, fontWeight: "900", color: "#1a7a2e", marginBottom: 4 },
  statLabel: { fontSize: 10, color: "#666", fontWeight: "600", textAlign: "center" },
  section: {
    backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 14,
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderBottomWidth: 3, borderBottomColor: "#f5c518",
  },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#111", marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  infoIcon: { fontSize: 22, width: 32 },
  infoLabel: { fontSize: 11, color: "#999", fontWeight: "600", marginBottom: 2 },
  infoValue: { fontSize: 15, color: "#111", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 10 },
  actionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  actionIcon: { fontSize: 20, width: 32 },
  actionText: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111" },
  actionArrow: { fontSize: 16, color: "#f5c518", fontWeight: "900" },
  zoneBox: {
    backgroundColor: "#fffbeb", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#f5c518", gap: 4,
  },
  zoneRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  zoneEmoji: { fontSize: 22 },
  zoneCity: { fontSize: 14, fontWeight: "900", color: "#1a7a2e" },
  zoneDetail: { fontSize: 12, color: "#666", fontWeight: "600" },
  zoneDivider: { height: 1, backgroundColor: "#fcd34d", marginVertical: 4 },
  deleteBtn: {
    marginHorizontal: 16, marginBottom: 14, backgroundColor: "#fff",
    borderRadius: 16, padding: 18, alignItems: "center",
    borderWidth: 1.5, borderColor: "#ef4444",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  deleteText: { color: "#ef4444", fontWeight: "900", fontSize: 16 },
  logoutBtn: {
    marginHorizontal: 16, marginBottom: 14, backgroundColor: "#fff",
    borderRadius: 16, padding: 18, alignItems: "center",
    borderWidth: 1.5, borderColor: "#ef4444",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  logoutText: { color: "#ef4444", fontWeight: "900", fontSize: 16 },
  footer: { textAlign: "center", color: "#aaa", fontSize: 11, marginTop: 4, marginBottom: 8 },
});