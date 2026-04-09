// app/_layout.tsx
import { Stack, useSegments, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { STRIPE_PUBLISHABLE_KEY } from "../lib/api";

const ROLE_KEY = "freshcart_role"; // "customer" | "admin" | null

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const segKey = useMemo(() => segments.join("/"), [segments]);

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

  useEffect(() => {
    if (!ready) return;

    const group = segments[0];
    const inAuth = group === "(auth)";
    const inTabs = group === "(tabs)";
    const inAdmin = group === "admin";

    const isAdminLogin = segments[0] === "admin" && segments[1] === "login";

    if (!role) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    if (role === "customer") {
      if (!inTabs && !isAdminLogin) router.replace("/(tabs)");
      return;
    }

    if (role === "admin") {
      if (!inAdmin) router.replace("/admin/orders");
      return;
    }

    router.replace("/(auth)/login");
  }, [ready, role, segKey, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
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