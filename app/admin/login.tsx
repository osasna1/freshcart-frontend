import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";

const TOKEN_KEY = "freshcart_token";
const ROLE_KEY = "freshcart_role";

export default function AdminLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const notify = (title: string, msg: string) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
  };

  const login = async () => {
    if (!phone.trim() || !password) {
      notify("Missing info", "Please enter phone and password.");
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
        notify("Login failed", data.message || "Invalid credentials.");
        return;
      }

      if (data.user.role !== "admin") {
        notify("Access denied", "This login is for admins only.");
        return;
      }

      await storage.setItem(TOKEN_KEY, data.token);
      await storage.setItem(ROLE_KEY, data.user.role);

      router.replace("/admin/orders");
    } catch (err) {
      notify("Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🛒</Text>
      <Text style={styles.title}>Admin Login</Text>
      <Text style={styles.sub}>FreshCart Dashboard</Text>

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Admin phone number"
        placeholderTextColor="#999"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        style={[styles.btn, loading && { opacity: 0.6 }]}
        onPress={login}
        disabled={loading}
      >
        <Text style={styles.btnText}>{loading ? "Logging in..." : "Login as Admin"}</Text>
      </Pressable>

      <Pressable style={styles.back} onPress={() => router.replace("/(tabs)")}>
        <Text style={styles.backText}>← Back to Customer App</Text>
      </Pressable>

      <Text style={styles.hint}>Default: 0000000000 / admin123</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" },
  emoji: { fontSize: 48, textAlign: "center", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "900", textAlign: "center" },
  sub: { color: "#666", textAlign: "center", marginBottom: 24 },
  label: { fontWeight: "900", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: "#e6e6e6",
    backgroundColor: "#fafafa", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 16,
  },
  btn: {
    backgroundColor: "#111", paddingVertical: 14,
    borderRadius: 12, alignItems: "center", marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  back: { paddingVertical: 14, alignItems: "center" },
  backText: { fontWeight: "700", color: "#666" },
  hint: { textAlign: "center", color: "#bbb", fontSize: 12, marginTop: 8 },
});
