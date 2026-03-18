import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";

export default function HomeScreen() {
  const handleStart = () => {
    router.push("/(tabs)/products");
  };

  const goAdmin = () => {
    router.push("/admin/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🛒</Text>

      <Pressable
        style={styles.titleWrap}
        onLongPress={goAdmin}
        delayLongPress={800}
      >
        <Text style={styles.title}>FreshCart 🚀</Text>
      </Pressable>

      <Text style={styles.subtitle}>Your local grocery delivery app</Text>

      <Pressable style={styles.button} onPress={handleStart}>
        <Text style={styles.buttonText}>Start Shopping</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: { fontSize: 60, marginBottom: 10 },
  titleWrap: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  title: { fontSize: 34, fontWeight: "bold", color: "#111" },
  subtitle: {
    fontSize: 16, color: "#666", textAlign: "center",
    marginTop: 10, marginBottom: 30,
  },
  button: {
    backgroundColor: "#111", paddingVertical: 14,
    paddingHorizontal: 40, borderRadius: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});