// app/_layout.tsx
import { Stack, useSegments, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";
import { StripeProvider } from "@stripe/stripe-react-native"; // ✅ ADDED

const ROLE_KEY = "freshcart_role"; // "customer" | "admin" | null

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""; // ✅ ADDED

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // helps trigger refresh when navigation changes
  const segKey = useMemo(() => segments.join("/"), [segments]);

  // ✅ ALWAYS re-check role when route changes
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await AsyncStorage.getItem(ROLE_KEY);
        if (alive) setRole(r);
      } catch {
        if (alive) setRole(null);
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [segKey]);

  // ✅ Redirect rules (ONLY here)
  useEffect(() => {
    if (!ready) return;

    const group = segments[0]; // "(auth)" | "(tabs)" | "admin" | undefined
    const inAuth = group === "(auth)";
    const inTabs = group === "(tabs)";
    const inAdmin = group === "admin";

    // ✅ Allow visiting ONLY /admin/login even if you're customer
    const isAdminLogin = segments[0] === "admin" && segments[1] === "login";

    // Not logged in -> auth only
    if (!role) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    // Customer -> tabs, but allow visiting /admin/login
    if (role === "customer") {
      if (!inTabs && !isAdminLogin) router.replace("/(tabs)");
      return;
    }

    // Admin -> admin only
    if (role === "admin") {
      if (!inAdmin) router.replace("/admin/orders");
      return;
    }

    // fallback
    router.replace("/(auth)/login");
  }, [ready, role, segKey, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // ✅ ADDED — StripeProvider wraps the entire Stack
  return (
    <StripeProvider
      publishableKey={STRIPE_KEY}
      merchantIdentifier="merchant.com.freshcart"
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
      </Stack>
    </StripeProvider>
  );
}