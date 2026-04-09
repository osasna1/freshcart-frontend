import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Alert, Platform, KeyboardAvoidingView, ScrollView, Linking,
} from "react-native";
import { router } from "expo-router";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";
import { registerForPushNotifications } from "../../lib/notifications";
import { CartStore } from "../../lib/cartStore";

const TOKEN_KEY = "freshcart_token";
const CUSTOMER_KEY = "freshcart_customer";
const ROLE_KEY = "freshcart_role";
const SELECTED_STORE_KEY = "freshcart_selected_store";
const SELECTED_CITY_KEY = "freshcart_selected_city";

const PRIVACY_URL = "https://freshcart-legal.tiiny.site/#privacy";
const TERMS_URL = "https://freshcart-legal.tiiny.site/#terms";

function notify(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export default function CustomerLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = async () => {
    if (!phone.trim() || !password) {
      notify("Missing info", "Please enter phone number and password.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify("Login failed", data.message || data.error || "Invalid credentials.");
        return;
      }

      // ✅ Clear cart and store selection on every login
      // This ensures each user starts with a fresh cart
      await CartStore.clearCart();
      await storage.removeItem(SELECTED_STORE_KEY);
      await storage.removeItem(SELECTED_CITY_KEY);

      await storage.setItem(TOKEN_KEY, data.token);
      await storage.setItem(CUSTOMER_KEY, JSON.stringify(data.user));
      await storage.setItem(ROLE_KEY, data.user.role || "customer");

      try {
        const pushToken = await registerForPushNotifications();
        if (pushToken) {
          await fetch(`${API_BASE_URL}/auth/push-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` },
            body: JSON.stringify({ pushToken }),
          });
        }
      } catch {}

      router.replace("/(tabs)");
    } catch (error: any) {
      notify("Error", String(error?.message || "Could not connect to server."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* ─── HEADER ─── */}
        <View style={styles.headerSection}>
          <Pressable onLongPress={() => router.push("/admin/login")} delayLongPress={800}>
            <View style={styles.logoWrap}>
              <View style={styles.logoInner}>
                <Text style={styles.logoEmoji}>🛒</Text>
              </View>
            </View>
          </Pressable>

          <View style={styles.brandRow}>
            <Text style={styles.brandFresh}>Fresh</Text>
            <Text style={styles.brandCart}>Cart</Text>
          </View>
          <Text style={styles.tagline}>🍎 Fresh groceries, fast delivery</Text>
        </View>

        {/* ─── CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardAccentBar} />

          <Text style={styles.cardTitle}>Welcome back 👋</Text>
          <Text style={styles.cardSub}>Sign in to continue shopping</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 4161234567"
                placeholderTextColor="#bbb"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.inputField, { flex: 1 }]}
                placeholder="Your password"
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={login}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? "Signing in..." : "Sign In →"}</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>new to FreshCart?</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.registerBtn} onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.registerBtnText}>Create Free Account</Text>
          </Pressable>

          {/* ─── TERMS & PRIVACY ─── */}
          <View style={styles.legalRow}>
            <Text style={styles.legalText}>By using FreshCart you agree to our </Text>
            <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={styles.legalLink}>Terms</Text>
            </Pressable>
            <Text style={styles.legalText}> & </Text>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── FOOTER ─── */}
        <Pressable
          style={styles.resetBtn}
          onPress={async () => {
            await CartStore.clearCart();
            await storage.multiRemove([TOKEN_KEY, CUSTOMER_KEY, ROLE_KEY, SELECTED_STORE_KEY, SELECTED_CITY_KEY]);
            notify("Reset done", "Session reset complete.");
          }}
        >
          <Text style={styles.resetText}>Reset Session</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#1a7a2e",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerSection: { alignItems: "center", paddingTop: 72, paddingBottom: 36 },
  logoWrap: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: "#f5c518",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
    borderWidth: 4, borderColor: "#fff",
    shadowColor: "#f5c518", shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
  },
  logoInner: { alignItems: "center", justifyContent: "center" },
  logoEmoji: { fontSize: 44 },
  brandRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  brandFresh: { fontSize: 36, fontWeight: "900", color: "#ffffff" },
  brandCart: { fontSize: 36, fontWeight: "900", color: "#f5c518" },
  tagline: { fontSize: 13, color: "#a7f3d0", marginTop: 8, fontWeight: "500" },
  card: {
    backgroundColor: "#fff", borderRadius: 28, padding: 24, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 8,
  },
  cardAccentBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 5, backgroundColor: "#f5c518",
  },
  cardTitle: { fontSize: 24, fontWeight: "900", color: "#111", marginBottom: 4, marginTop: 10 },
  cardSub: { fontSize: 14, color: "#888", marginBottom: 24, fontWeight: "500" },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#e8e8e8", borderRadius: 14,
    backgroundColor: "#fafafa", paddingHorizontal: 12, paddingVertical: 4,
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  inputField: { flex: 1, fontSize: 15, color: "#111", paddingVertical: 11 },
  eyeBtn: { padding: 8 },
  eyeText: { fontSize: 18 },
  loginBtn: {
    backgroundColor: "#f5c518",
    borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
    shadowColor: "#f5c518", shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  loginBtnDisabled: { backgroundColor: "#ddd", shadowOpacity: 0 },
  loginBtnText: { color: "#111", fontWeight: "900", fontSize: 16 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#eee" },
  dividerText: { marginHorizontal: 10, color: "#aaa", fontWeight: "600", fontSize: 12 },
  registerBtn: {
    borderWidth: 2, borderColor: "#1a7a2e",
    borderRadius: 14, paddingVertical: 14, alignItems: "center",
    backgroundColor: "#1a7a2e",
  },
  registerBtnText: { color: "#f5c518", fontWeight: "900", fontSize: 15 },
  legalRow: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "center", alignItems: "center",
    marginTop: 16, paddingHorizontal: 8,
  },
  legalText: { fontSize: 11, color: "#aaa" },
  legalLink: { fontSize: 11, color: "#1a7a2e", fontWeight: "700", textDecorationLine: "underline" },
  resetBtn: { alignItems: "center", paddingVertical: 24 },
  resetText: { color: "#a7f3d0", fontSize: 12, fontWeight: "600" },
});