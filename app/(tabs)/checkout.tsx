import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  FlatList,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { API_BASE_URL } from "../../lib/api";
import { storage } from "../../lib/storage";
import { checkDeliveryZone } from "../../lib/deliveryZones";
import { CartStore } from "../../lib/cartStore";

const TOKEN_KEY = "freshcart_token";
const CUSTOMER_PHONE_KEY = "freshcart_customer_phone";
const INTERAC_EMAIL = "mathewidemudia7@gmail.com";

// ✅ Clean filenames — all renamed properly
const STORES = [
  { name: "Any Store", emoji: "🏪", logo: null },
  { name: "Walmart", emoji: "🛒", logo: require("../../assets/images/walmart.png") },
  { name: "No Frills", emoji: "🥬", logo: require("../../assets/images/nofrills.png") },
  { name: "Metro", emoji: "🏙️", logo: require("../../assets/images/metro.png") },
  { name: "LCBO", emoji: "🍷", logo: require("../../assets/images/lcbo.png") },
  { name: "Dollarama", emoji: "💛", logo: require("../../assets/images/dollarama.png") },
  { name: "Costco", emoji: "🏢", logo: require("../../assets/images/costco.png") },
  { name: "FreshCo", emoji: "🛒", logo: require("../../assets/images/freshco.png") },
  { name: "Food Basics", emoji: "🛒", logo: require("../../assets/images/foodbasic.png") },
];

function safeJsonParse<T>(value: unknown, fallback: T): T {
  try {
    if (value == null) return fallback;
    const s = String(value);
    if (!s || s === "undefined" || s === "null") return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export default function CheckoutScreen() {
  const params = useLocalSearchParams();
  const cart = safeJsonParse<Record<string, number>>(params.cart, {});
  const products = safeJsonParse<any[]>(params.products, []);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const p = products.find((x: any) => String(x.id) === String(id));
        if (!p) return null;
        return { ...p, qty, lineTotal: Number(p.price) * Number(qty) };
      })
      .filter(Boolean) as any[];
  }, [cart, products]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.lineTotal), 0),
    [cartItems]
  );
  const deliveryFee = subtotal >= 50 ? 0 : 5;
  const total = subtotal + deliveryFee;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [postalMessage, setPostalMessage] = useState("");
  const [postalValid, setPostalValid] = useState<boolean | null>(null);
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [payment, setPayment] = useState<"cash" | "etransfer" | "card" | null>(null);
  const [interacConfirmed, setInteracConfirmed] = useState(false);
  const [selectedStore, setSelectedStore] = useState("Any Store");
  const [shoppingList, setShoppingList] = useState("");

  const DELIVERY_OPTIONS = ["ASAP", "1 hour", "2 hours"] as const;
  const [deliveryTime, setDeliveryTime] = useState<(typeof DELIVERY_OPTIONS)[number]>("ASAP");

  useFocusEffect(
    useCallback(() => {
      setOrderSuccess(false);
      setOrderNumber("");
      setPayment(null);
      setInteracConfirmed(false);
    }, [])
  );

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // ✅ Button only active when ALL required fields are filled
  const isFormReady =
    fullName.trim().length > 0 &&
    phone.trim().length > 0 &&
    streetAddress.trim().length > 0 &&
    city.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    postalValid === true &&
    payment !== null &&
    (payment !== "etransfer" || interacConfirmed);

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const handlePostalCode = (value: string) => {
    setPostalCode(value);
    if (value.replace(/\s/g, "").length >= 3) {
      const result = checkDeliveryZone(value);
      setPostalValid(result.allowed);
      setPostalMessage(result.message);
    } else {
      setPostalValid(null);
      setPostalMessage("");
    }
  };

  const fullAddress = `${streetAddress.trim()}, ${city.trim()}, ON, ${postalCode.trim().toUpperCase()}`;

  const validateForm = () => {
    if (!fullName.trim() || !phone.trim()) {
      notify("Missing info", "Please enter your name and phone number.");
      return false;
    }
    if (!streetAddress.trim() || !city.trim()) {
      notify("Missing info", "Please enter your street address and city.");
      return false;
    }
    if (!postalCode.trim()) {
      notify("Missing info", "Please enter your postal code.");
      return false;
    }
    const zoneCheck = checkDeliveryZone(postalCode);
    if (!zoneCheck.allowed) {
      notify("Outside delivery zone", "Sorry, we currently only deliver in Toronto and Oshawa.");
      return false;
    }
    if (!payment) {
      notify("Payment required", "Please select a payment method before placing your order.");
      return false;
    }
    if (payment === "etransfer" && !interacConfirmed) {
      notify("Confirm E-Transfer", `Please tick the checkbox confirming you will send $${total.toFixed(2)} to ${INTERAC_EMAIL}.`);
      return false;
    }
    return true;
  };

  const placeOrderDirect = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      const token = await storage.getItem(TOKEN_KEY);
      if (!token) { notify("Login required", "Please login again."); router.replace("/(auth)/login"); return; }
      await storage.setItem(CUSTOMER_PHONE_KEY, phone.trim());
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName: fullName.trim(),
          address: fullAddress,
          phone: phone.trim(),
          deliveryInstructions: deliveryInstructions.trim(),
          deliveryTime,
          paymentMethod: payment,
          storeName: selectedStore,
          shoppingList: shoppingList.trim(),
          items: cartItems.map((item) => ({ productId: String(item.id), qty: Number(item.qty) })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { notify("Order failed", data.message || data.error || "Could not place order."); return; }
      await CartStore.clearCart();
      setOrderNumber(data.order.orderNumber);
      setOrderSuccess(true);
    } catch { notify("Error", "Could not connect to server."); }
    finally { setSaving(false); }
  };

  const placeOrderWithCard = async () => {
    if (!validateForm()) return;
    if (Platform.OS === "web") { notify("Card payments on mobile only", "Please use the FreshCart app on your phone."); return; }
    try {
      setSaving(true);
      const token = await storage.getItem(TOKEN_KEY);
      if (!token) { notify("Login required", "Please login again."); router.replace("/(auth)/login"); return; }
      const intentRes = await fetch(`${API_BASE_URL}/payments/create-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: total }),
      });
      const intentData = await intentRes.json();
      if (!intentRes.ok || !intentData.clientSecret) { notify("Payment Error", "Could not initialize payment."); return; }
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "FreshCart",
        paymentIntentClientSecret: intentData.clientSecret,
        defaultBillingDetails: { name: fullName },
        applePay: { merchantCountryCode: "CA" },
        googlePay: { merchantCountryCode: "CA", testEnv: true },
        style: "automatic",
      });
      if (initError) { notify("Payment Error", initError.message); return; }
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) { if (paymentError.code !== "Canceled") notify("Payment Failed", paymentError.message); return; }
      await storage.setItem(CUSTOMER_PHONE_KEY, phone.trim());
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customerName: fullName.trim(),
          address: fullAddress,
          phone: phone.trim(),
          deliveryInstructions: deliveryInstructions.trim(),
          deliveryTime,
          paymentMethod: "card",
          paymentIntentId: intentData.paymentIntentId,
          storeName: selectedStore,
          shoppingList: shoppingList.trim(),
          items: cartItems.map((item) => ({ productId: String(item.id), qty: Number(item.qty) })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { notify("Order failed", data.message || "Payment taken but order failed. Contact support."); return; }
      await CartStore.clearCart();
      setOrderNumber(data.order.orderNumber);
      setOrderSuccess(true);
    } catch { notify("Error", "Could not connect to server."); }
    finally { setSaving(false); }
  };

  const handlePlaceOrder = () => {
    if (!payment) { notify("Payment required", "Please select a payment method."); return; }
    if (payment === "card") placeOrderWithCard();
    else placeOrderDirect();
  };

  // ─── SUCCESS SCREEN ───
  if (orderSuccess) {
    const store = STORES.find(s => s.name === selectedStore);
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconWrap}>
          <Text style={styles.successEmoji}>✅</Text>
        </View>
        <Text style={styles.successTitle}>Order Placed!</Text>
        <Text style={styles.successSub}>Your order has been received and is being processed.</Text>
        <View style={styles.successOrderBox}>
          <Text style={styles.successOrderLabel}>Order Number</Text>
          <Text style={styles.successOrderNum}>{orderNumber}</Text>
        </View>
        {selectedStore !== "Any Store" && (
          <View style={styles.storeBadge}>
            {store?.logo ? <Image source={store.logo} style={styles.storeBadgeLogo} resizeMode="contain" /> : <Text>{store?.emoji}</Text>}
            <Text style={styles.storeBadgeText}>Shopping from {selectedStore}</Text>
          </View>
        )}
        {payment === "etransfer" && (
          <View style={styles.interacReminder}>
            <Text style={styles.interacReminderTitle}>📧 Send E-Transfer Now</Text>
            <Text style={styles.interacReminderText}>Amount: <Text style={styles.interacBold}>${total.toFixed(2)}</Text></Text>
            <Text style={styles.interacReminderText}>To: <Text style={styles.interacBold}>{INTERAC_EMAIL}</Text></Text>
            <Text style={styles.interacReminderSub}>Order confirmed once payment is received.</Text>
          </View>
        )}
        <Text style={styles.successNote}>🚚 Estimated delivery: {deliveryTime === "ASAP" ? "30–45 min" : deliveryTime}</Text>
        <Pressable style={styles.successBtn} onPress={() => router.replace("/(tabs)/orders")}>
          <Text style={styles.successBtnText}>View My Orders</Text>
        </Pressable>
        <Pressable style={styles.successSecondary} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.successSecondaryText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <Pressable style={styles.backTopBtn} onPress={() => router.replace("/(tabs)/cart")}>
          <Text style={styles.backTopText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.totalPill}>
          <Text style={styles.totalPillText}>${total.toFixed(2)}</Text>
        </View>
      </View>

      {/* ─── SECTION: CUSTOMER INFO ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>👤</Text>
          <Text style={styles.sectionTitle}>Your Info</Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput style={styles.input} placeholder="e.g. John Smith" placeholderTextColor="#bbb" value={fullName} onChangeText={setFullName} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput style={styles.input} placeholder="e.g. 416-555-0123" placeholderTextColor="#bbb" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>
      </View>

      {/* ─── SECTION: PREFERRED STORE ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🏪</Text>
          <Text style={styles.sectionTitle}>Preferred Store</Text>
        </View>
        <Text style={styles.sectionHint}>Swipe to see all stores →</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STORES}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.storeList}
          renderItem={({ item: store }) => {
            const active = selectedStore === store.name;
            return (
              <Pressable style={[styles.storeChip, active && styles.storeChipActive]} onPress={() => setSelectedStore(store.name)}>
                {store.logo ? (
                  <Image source={store.logo} style={styles.storeLogo} resizeMode="contain" />
                ) : (
                  <Text style={styles.storeEmoji}>{store.emoji}</Text>
                )}
                <Text style={[styles.storeName, active && styles.storeNameActive]}>{store.name}</Text>
                {active && <View style={styles.storeCheck}><Text style={styles.storeCheckText}>✓</Text></View>}
              </Pressable>
            );
          }}
        />
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Shopping List <Text style={styles.optionalTag}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder={"e.g.\n2x whole milk\n1x bread"}
            placeholderTextColor="#bbb"
            value={shoppingList}
            onChangeText={setShoppingList}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.hint}>💡 List items you need — we'll buy exactly what you ask for!</Text>
        </View>
      </View>

      {/* ─── SECTION: DELIVERY ADDRESS ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📍</Text>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Street Address</Text>
          <TextInput style={styles.input} placeholder="e.g. 123 Main Street, Apt 4B" placeholderTextColor="#bbb" value={streetAddress} onChangeText={setStreetAddress} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>City</Text>
          <TextInput style={styles.input} placeholder="e.g. Toronto or Oshawa" placeholderTextColor="#bbb" value={city} onChangeText={setCity} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Postal Code</Text>
          <TextInput
            style={[styles.input, postalValid === true && styles.inputValid, postalValid === false && styles.inputInvalid]}
            placeholder="e.g. M5V 3A8"
            placeholderTextColor="#bbb"
            value={postalCode}
            onChangeText={handlePostalCode}
            autoCapitalize="characters"
            maxLength={7}
          />
          {postalMessage !== "" && (
            <View style={[styles.zoneBox, postalValid ? styles.zoneBoxValid : styles.zoneBoxInvalid]}>
              <Text style={[styles.zoneText, postalValid ? styles.zoneTextValid : styles.zoneTextInvalid]}>{postalMessage}</Text>
            </View>
          )}
          {postalValid === false && (
            <View style={styles.zoneInfoBox}>
              <Text style={styles.zoneInfoText}>📍 We deliver to:{"\n"}• Toronto (M postal codes){"\n"}• Oshawa (L1G, L1H, L1J, L1K, L1L)</Text>
            </View>
          )}
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery Instructions <Text style={styles.optionalTag}>(optional)</Text></Text>
          <TextInput style={[styles.input, { height: 80 }]} placeholder="e.g. Ring doorbell, leave at door" placeholderTextColor="#bbb" value={deliveryInstructions} onChangeText={setDeliveryInstructions} multiline textAlignVertical="top" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Delivery Time</Text>
          <View style={styles.chipRow}>
            {DELIVERY_OPTIONS.map((opt) => {
              const active = deliveryTime === opt;
              return (
                <Pressable key={opt} style={[styles.timeChip, active && styles.timeChipActive]} onPress={() => setDeliveryTime(opt)}>
                  <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* ─── SECTION: PAYMENT ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>💳</Text>
          <Text style={styles.sectionTitle}>Payment Method</Text>
        </View>
        {!payment && <Text style={styles.paymentHint}>⚠️ Please select a payment method</Text>}
        <View style={styles.paymentOptions}>
          <Pressable style={[styles.paymentCard, payment === "cash" && styles.paymentCardActive]} onPress={() => { setPayment("cash"); setInteracConfirmed(false); }}>
            <Text style={styles.paymentCardIcon}>💵</Text>
            <Text style={[styles.paymentCardText, payment === "cash" && styles.paymentCardTextActive]}>Cash</Text>
            {payment === "cash" && <View style={styles.paymentCheck}><Text style={styles.paymentCheckText}>✓</Text></View>}
          </Pressable>
          <Pressable style={[styles.paymentCard, payment === "etransfer" && styles.paymentCardActive]} onPress={() => { setPayment("etransfer"); setInteracConfirmed(false); }}>
            <Text style={styles.paymentCardIcon}>📧</Text>
            <Text style={[styles.paymentCardText, payment === "etransfer" && styles.paymentCardTextActive]}>E-Transfer</Text>
            {payment === "etransfer" && <View style={styles.paymentCheck}><Text style={styles.paymentCheckText}>✓</Text></View>}
          </Pressable>
          {Platform.OS !== "web" && (
            <Pressable style={[styles.paymentCard, payment === "card" && styles.paymentCardActive]} onPress={() => { setPayment("card"); setInteracConfirmed(false); }}>
              <Text style={styles.paymentCardIcon}>💳</Text>
              <Text style={[styles.paymentCardText, payment === "card" && styles.paymentCardTextActive]}>Card / Apple Pay</Text>
              {payment === "card" && <View style={styles.paymentCheck}><Text style={styles.paymentCheckText}>✓</Text></View>}
            </Pressable>
          )}
        </View>
        {Platform.OS === "web" && (
          <View style={styles.webNote}><Text style={styles.webNoteText}>💳 Card payments available on the mobile app</Text></View>
        )}
        {payment === "etransfer" && (
          <View style={styles.interacBox}>
            <Text style={styles.interacTitle}>📧 Interac e-Transfer Details</Text>
            <Text style={styles.interacText}>Send <Text style={styles.interacBold}>${total.toFixed(2)}</Text> to:</Text>
            <View style={styles.interacEmailBox}><Text style={styles.interacEmail}>{INTERAC_EMAIL}</Text></View>
            <Text style={styles.interacNote}>Use your order number as the message. Order confirmed once payment received.</Text>
            <Pressable style={styles.interacConfirmRow} onPress={() => setInteracConfirmed(!interacConfirmed)}>
              <View style={[styles.checkbox, interacConfirmed && styles.checkboxActive]}>
                {interacConfirmed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.interacConfirmText}>I understand I need to send the e-Transfer to complete my order</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ─── SECTION: ORDER SUMMARY ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🧾</Text>
          <Text style={styles.sectionTitle}>Order Summary</Text>
        </View>
        {selectedStore !== "Any Store" && (
          <View style={styles.selectedStoreBadge}>
            {STORES.find(s => s.name === selectedStore)?.logo ? (
              <Image source={STORES.find(s => s.name === selectedStore)!.logo!} style={styles.summaryStoreLogo} resizeMode="contain" />
            ) : null}
            <Text style={styles.selectedStoreName}>Shopping from {selectedStore}</Text>
          </View>
        )}
        <View style={styles.summaryRows}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, deliveryFee === 0 && { color: "#1a7a2e" }]}>
              {deliveryFee === 0 ? "🎉 FREE" : `$${deliveryFee.toFixed(2)}`}
            </Text>
          </View>
          {deliveryFee === 0 && <Text style={styles.freeNote}>Free delivery on orders over $50!</Text>}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* ─── FOOTER ─── */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.placeBtn, (!isFormReady || saving) && styles.placeBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={!isFormReady || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.placeBtnText}>
                {payment === "card" ? `💳 Pay $${total.toFixed(2)}` : "Place Order →"}
              </Text>
              {payment !== "card" && <Text style={styles.placeBtnSub}>${total.toFixed(2)} total</Text>}
            </>
          )}
        </Pressable>
        {!payment && <Text style={styles.blockedNote}>⚠️ Select a payment method above</Text>}
        {payment === "etransfer" && !interacConfirmed && <Text style={styles.blockedNote}>⚠️ Tick the checkbox above to confirm</Text>}
        {postalValid === false && <Text style={styles.blockedNote}>⚠️ Postal code is outside delivery zone</Text>}
        <Pressable style={styles.backFooterBtn} onPress={() => router.replace("/(tabs)/cart")}>
          <Text style={styles.backFooterText}>← Back to Cart</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f4f7f5", paddingBottom: 40 },
  header: {
    backgroundColor: "#1a7a2e", paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backTopBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  backTopText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
  totalPill: { backgroundColor: "rgba(255,255,255,0.25)", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  totalPillText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  section: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  sectionHint: { fontSize: 12, color: "#999", marginBottom: 10, marginTop: -8 },
  inputGroup: { marginBottom: 12 },
  inputRow: { flexDirection: "row", gap: 10 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 6 },
  optionalTag: { fontSize: 11, color: "#aaa", fontWeight: "500" },
  input: {
    borderWidth: 1.5, borderColor: "#e8e8e8", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    backgroundColor: "#fafafa", color: "#111",
  },
  inputValid: { borderColor: "#1a7a2e", borderWidth: 2, backgroundColor: "#f0faf4" },
  inputInvalid: { borderColor: "#ef4444", borderWidth: 2, backgroundColor: "#fff5f5" },
  hint: { fontSize: 12, color: "#999", marginTop: 6 },
  storeList: { paddingVertical: 4 },
  storeChip: {
    alignItems: "center", borderWidth: 1.5, borderColor: "#e8e8e8",
    borderRadius: 14, padding: 12, width: 90, backgroundColor: "#fafafa",
    marginRight: 10, position: "relative",
  },
  storeChipActive: { borderColor: "#1a7a2e", borderWidth: 2, backgroundColor: "#f0faf4" },
  storeLogo: { width: 48, height: 48, borderRadius: 8, marginBottom: 6, backgroundColor: "#fff" },
  storeEmoji: { fontSize: 28, marginBottom: 6 },
  storeName: { fontSize: 10, fontWeight: "700", color: "#666", textAlign: "center" },
  storeNameActive: { color: "#1a7a2e" },
  storeCheck: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: "#1a7a2e", alignItems: "center", justifyContent: "center" },
  storeCheckText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  chipRow: { flexDirection: "row", gap: 10 },
  timeChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa" },
  timeChipActive: { backgroundColor: "#1a7a2e", borderColor: "#1a7a2e" },
  timeChipText: { fontWeight: "700", color: "#555", fontSize: 14 },
  timeChipTextActive: { color: "#fff" },
  zoneBox: { borderRadius: 10, padding: 10, marginTop: 8 },
  zoneBoxValid: { backgroundColor: "#dcfce7" },
  zoneBoxInvalid: { backgroundColor: "#fee2e2" },
  zoneText: { fontWeight: "700", fontSize: 13 },
  zoneTextValid: { color: "#16a34a" },
  zoneTextInvalid: { color: "#b91c1c" },
  zoneInfoBox: { backgroundColor: "#f9fafb", borderRadius: 10, padding: 10, marginTop: 6 },
  zoneInfoText: { color: "#555", fontSize: 13, lineHeight: 20 },
  paymentHint: { color: "#b45309", fontWeight: "700", fontSize: 13, marginBottom: 10 },
  paymentOptions: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  paymentCard: {
    flex: 1, minWidth: 90, borderWidth: 1.5, borderColor: "#e8e8e8",
    borderRadius: 14, padding: 14, alignItems: "center", backgroundColor: "#fafafa", position: "relative",
  },
  paymentCardActive: { borderColor: "#1a7a2e", borderWidth: 2, backgroundColor: "#f0faf4" },
  paymentCardIcon: { fontSize: 24, marginBottom: 6 },
  paymentCardText: { fontSize: 12, fontWeight: "700", color: "#555", textAlign: "center" },
  paymentCardTextActive: { color: "#1a7a2e" },
  paymentCheck: { position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: "#1a7a2e", alignItems: "center", justifyContent: "center" },
  paymentCheckText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  webNote: { backgroundColor: "#f0f9ff", borderRadius: 10, padding: 12 },
  webNoteText: { color: "#0369a1", fontSize: 13, fontWeight: "600" },
  interacBox: { backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#fcd34d", gap: 8, marginTop: 4 },
  interacTitle: { fontSize: 14, fontWeight: "900", color: "#92400e" },
  interacText: { fontSize: 14, color: "#78350f" },
  interacBold: { fontWeight: "900", color: "#111" },
  interacEmailBox: { backgroundColor: "#fff", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#fcd34d", alignItems: "center" },
  interacEmail: { fontSize: 15, fontWeight: "900", color: "#1a7a2e" },
  interacNote: { fontSize: 12, color: "#92400e", lineHeight: 18 },
  interacConfirmRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#111", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#1a7a2e", borderColor: "#1a7a2e" },
  checkmark: { color: "#fff", fontWeight: "900", fontSize: 13 },
  interacConfirmText: { flex: 1, fontSize: 13, color: "#333", fontWeight: "600" },
  selectedStoreBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0faf4", borderRadius: 10, padding: 10, marginBottom: 12 },
  summaryStoreLogo: { width: 28, height: 28, borderRadius: 4 },
  selectedStoreName: { fontWeight: "800", color: "#1a7a2e", fontSize: 13 },
  summaryRows: { gap: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14, color: "#666", fontWeight: "600" },
  summaryValue: { fontSize: 14, color: "#111", fontWeight: "700" },
  freeNote: { fontSize: 12, color: "#1a7a2e", fontWeight: "700" },
  totalRow: { borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 17, fontWeight: "900", color: "#111" },
  totalValue: { fontSize: 17, fontWeight: "900", color: "#1a7a2e" },
  footer: { marginHorizontal: 16, marginTop: 16, gap: 10 },
  placeBtn: {
    backgroundColor: "#1a7a2e", borderRadius: 16, paddingVertical: 18,
    alignItems: "center", shadowColor: "#1a7a2e", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  placeBtnDisabled: { backgroundColor: "#ccc", shadowOpacity: 0 },
  placeBtnText: { color: "#fff", fontWeight: "900", fontSize: 17 },
  placeBtnSub: { color: "#a7f3d0", fontSize: 12, fontWeight: "700", marginTop: 2 },
  blockedNote: { color: "#ef4444", fontWeight: "700", textAlign: "center", fontSize: 13 },
  backFooterBtn: { alignItems: "center", paddingVertical: 12 },
  backFooterText: { color: "#666", fontWeight: "700", fontSize: 14 },
  successContainer: { flex: 1, backgroundColor: "#f4f7f5", alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  successIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  successEmoji: { fontSize: 52 },
  successTitle: { fontSize: 28, fontWeight: "900", color: "#111" },
  successSub: { fontSize: 15, color: "#666", textAlign: "center", fontWeight: "500" },
  successOrderBox: { backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center", width: "100%", borderWidth: 1, borderColor: "#e8e8e8" },
  successOrderLabel: { fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 },
  successOrderNum: { fontSize: 18, fontWeight: "900", color: "#1a7a2e" },
  storeBadge: { backgroundColor: "#f0faf4", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 8, width: "100%" },
  storeBadgeLogo: { width: 24, height: 24, borderRadius: 4 },
  storeBadgeText: { color: "#1a7a2e", fontWeight: "800", fontSize: 14 },
  interacReminder: { backgroundColor: "#fff8e1", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#f59e0b", width: "100%", gap: 4 },
  interacReminderTitle: { fontSize: 15, fontWeight: "900", color: "#92400e", marginBottom: 4 },
  interacReminderText: { fontSize: 14, color: "#78350f" },
  interacReminderSub: { fontSize: 12, color: "#92400e", marginTop: 4 },
  successNote: { fontSize: 14, color: "#555", fontWeight: "600" },
  successBtn: { backgroundColor: "#1a7a2e", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, width: "100%", alignItems: "center" },
  successBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  successSecondary: { paddingVertical: 10, alignItems: "center" },
  successSecondaryText: { color: "#666", fontWeight: "700", fontSize: 14 },
});