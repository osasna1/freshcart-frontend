import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  Platform, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";

const TOKEN_KEY = "freshcart_token";
const CUSTOMER_KEY = "freshcart_customer";
const ROLE_KEY = "freshcart_role";

function isStrongPassword(password: string) {
  if (password.length < 6) return false;
  return /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

function notify(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else {
    const { Alert } = require("react-native");
    Alert.alert(title, message);
  }
}

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: "Too short", color: "#ef4444" };
    if (!isStrongPassword(password)) return { label: "Add numbers", color: "#f5c518" };
    return { label: "Strong ✓", color: "#f5c518" };
  };

  const strength = passwordStrength();

  const register = async () => {
    if (!fullName.trim() || !phone.trim() || !password) {
      notify("Missing info", "Please fill in all fields.");
      return;
    }
    if (!isStrongPassword(password)) {
      notify("Weak password", "Password must be at least 6 characters with letters and numbers.");
      return;
    }
    if (password !== confirm) {
      notify("Password mismatch", "Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim(), password, role: "customer" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        notify("Signup failed", data?.message || data?.error || "Could not create account.");
        return;
      }
      await storage.setItem(TOKEN_KEY, data.token);
      await storage.setItem(CUSTOMER_KEY, JSON.stringify(data.user));
      await storage.setItem(ROLE_KEY, data.user.role || "customer");
      notify("Welcome! 🎉", "Your account has been created successfully.");
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

        {/* ─── HEADER — identical to login ─── */}
        <View style={styles.headerSection}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🛒</Text>
          </View>
          <View style={styles.brandRow}>
            <Text style={styles.brandFresh}>Fresh</Text>
            <Text style={styles.brandCart}>Cart</Text>
          </View>
          <Text style={styles.tagline}>🍎 Fresh groceries, fast delivery</Text>
        </View>

        {/* ─── CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardAccentBar} />

          <Text style={styles.cardTitle}>Create Account ✨</Text>
          <Text style={styles.cardSub}>Join thousands of happy shoppers</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Your full name"
                placeholderTextColor="#bbb"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          </View>

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
                placeholder="Min 6 chars with letters & numbers"
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
              </Pressable>
            </View>
            {strength && (
              <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.inputField, { flex: 1 }]}
                placeholder="Re-enter your password"
                placeholderTextColor="#bbb"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showConfirm ? "🙈" : "👁️"}</Text>
              </Pressable>
            </View>
            {confirm.length > 0 && (
              <Text style={{ color: confirm === password ? "#f5c518" : "#ef4444", fontSize: 12, marginTop: 4, fontWeight: "700" }}>
                {confirm === password ? "Passwords match ✓" : "Passwords don't match"}
              </Text>
            )}
          </View>

          {/* ✅ Yellow button — matches Sign In */}
          <Pressable
            style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
            onPress={register}
            disabled={loading}
          >
            <Text style={styles.registerBtnText}>{loading ? "Creating Account..." : "Create Account →"}</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>already have an account?</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ✅ Green button with yellow text — matches Create Free Account on login */}
          <Pressable style={styles.loginBtn} onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.loginBtnText}>Sign In</Text>
          </Pressable>
        </View>

        <View style={styles.terms}>
          <Text style={styles.termsText}>By creating an account you agree to our Terms of Service</Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#1a7a2e", paddingHorizontal: 20, paddingBottom: 40 },

  headerSection: { alignItems: "center", paddingTop: 60, paddingBottom: 28 },
  logoWrap: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: "#f5c518", alignItems: "center", justifyContent: "center",
    marginBottom: 20, borderWidth: 4, borderColor: "#fff",
    shadowColor: "#f5c518", shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
  },
  logoEmoji: { fontSize: 44 },
  brandRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  brandFresh: { fontSize: 36, fontWeight: "900", color: "#ffffff" },
  brandCart: { fontSize: 36, fontWeight: "900", color: "#f5c518" },
  tagline: { fontSize: 13, color: "#a7f3d0", marginTop: 8, fontWeight: "500" },

  card: {
    backgroundColor: "#fff", borderRadius: 28, padding: 24, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 8,
  },
  cardAccentBar: { position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: "#f5c518" },
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
  strengthText: { fontSize: 12, fontWeight: "700", marginTop: 4 },

  registerBtn: {
    backgroundColor: "#f5c518", borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
    shadowColor: "#f5c518", shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  registerBtnDisabled: { backgroundColor: "#ddd", shadowOpacity: 0 },
  registerBtnText: { color: "#111", fontWeight: "900", fontSize: 16 },

  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#eee" },
  dividerText: { marginHorizontal: 10, color: "#aaa", fontWeight: "600", fontSize: 12 },

  loginBtn: {
    borderWidth: 2, borderColor: "#1a7a2e",
    borderRadius: 14, paddingVertical: 14, alignItems: "center",
    backgroundColor: "#1a7a2e",
  },
  loginBtnText: { color: "#f5c518", fontWeight: "900", fontSize: 15 },

  terms: { alignItems: "center", paddingTop: 20 },
  termsText: { color: "#a7f3d0", fontSize: 11, textAlign: "center", fontWeight: "500" },
});