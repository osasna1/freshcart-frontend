import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Image } from "react-native";

const STORES = [
  { name: "Walmart", logo: require("../../assets/images/walmart.png") },
  { name: "No Frills", logo: require("../../assets/images/nofrills.png") },
  { name: "Metro", logo: require("../../assets/images/metro.png") },
  { name: "LCBO", logo: require("../../assets/images/lcbo.png") },
  { name: "Dollarama", logo: require("../../assets/images/dollarama.png") },
  { name: "Costco", logo: require("../../assets/images/costco.png") },
  { name: "FreshCo", logo: require("../../assets/images/freshco.png") },
  { name: "Food Basics", logo: require("../../assets/images/foodbasic.png") },
];

export default function InfoScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerAccentBar} />
        <View style={styles.logoWrap}>
          <Text style={styles.headerEmoji}>🛒</Text>
        </View>
        <View style={styles.brandRow}>
          <Text style={styles.brandFresh}>Fresh</Text>
          <Text style={styles.brandCart}>Cart</Text>
        </View>
        <Text style={styles.headerSub}>Toronto, Oshawa & Barrie Grocery Delivery</Text>
      </View>

      {/* ─── DELIVERY ZONES ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📍</Text>
          <Text style={styles.sectionTitle}>Delivery Zones</Text>
        </View>
        <View style={styles.zoneRow}>
          <View style={styles.zoneCard}>
            <Text style={styles.zoneEmoji}>🏙️</Text>
            <Text style={styles.zoneCity}>Toronto</Text>
            <Text style={styles.zoneDetail}>All M postal codes</Text>
          </View>
          <View style={styles.zoneCard}>
            <Text style={styles.zoneEmoji}>🏘️</Text>
            <Text style={styles.zoneCity}>Oshawa</Text>
            <Text style={styles.zoneDetail}>L1G · L1H · L1J{"\n"}L1K · L1L</Text>
          </View>
          <View style={styles.zoneCard}>
            <Text style={styles.zoneEmoji}>🌲</Text>
            <Text style={styles.zoneCity}>Barrie</Text>
            <Text style={styles.zoneDetail}>L4M · L4N · L9J</Text>
          </View>
        </View>
      </View>

      {/* ─── DELIVERY FEES ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>💰</Text>
          <Text style={styles.sectionTitle}>Delivery Fees</Text>
        </View>
        <View style={styles.feeRow}>
          <View style={styles.feeCard}>
            <Text style={styles.feeAmount}>$5.00</Text>
            <Text style={styles.feeLabel}>Orders under $50</Text>
          </View>
          <View style={[styles.feeCard, styles.feeCardFree]}>
            <Text style={[styles.feeAmount, { color: "#1a7a2e" }]}>🎉 FREE</Text>
            <Text style={styles.feeLabel}>Orders over $50</Text>
          </View>
        </View>
        <View style={styles.firstOrderBanner}>
          <Text style={styles.firstOrderText}>🎁 First order? Delivery is FREE!</Text>
        </View>
      </View>

      {/* ─── DELIVERY HOURS ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🕐</Text>
          <Text style={styles.sectionTitle}>Delivery Hours</Text>
        </View>
        <View style={styles.hoursBox}>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Monday – Friday</Text>
            <Text style={styles.hoursTime}>9:00 AM – 9:00 PM</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Saturday</Text>
            <Text style={styles.hoursTime}>9:00 AM – 8:00 PM</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Sunday</Text>
            <Text style={styles.hoursTime}>10:00 AM – 6:00 PM</Text>
          </View>
        </View>
      </View>

      {/* ─── STORES WE SHOP ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🏪</Text>
          <Text style={styles.sectionTitle}>Stores We Shop</Text>
        </View>
        <View style={styles.storeGrid}>
          {STORES.map((store) => (
            <View key={store.name} style={styles.storeCard}>
              <Image source={store.logo} style={styles.storeLogo} resizeMode="contain" />
              <Text style={styles.storeName}>{store.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ─── HOW IT WORKS ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📋</Text>
          <Text style={styles.sectionTitle}>How It Works</Text>
        </View>
        {[
          { step: "1", icon: "🛍️", title: "Browse & Add", desc: "Browse products and add them to your cart" },
          { step: "2", icon: "📍", title: "Enter Details", desc: "Add your delivery address and preferred store" },
          { step: "3", icon: "💳", title: "Pay Securely", desc: "Pay by card, Apple Pay, cash or e-Transfer" },
          { step: "4", icon: "🚚", title: "Fast Delivery", desc: "We shop and deliver to your door in 30–45 min" },
        ].map((item) => (
          <View key={item.step} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{item.step}</Text>
            </View>
            <Text style={styles.stepIcon}>{item.icon}</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ─── PAYMENT METHODS ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>💳</Text>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
        </View>
        <View style={styles.paymentGrid}>
          {["💵 Cash on Delivery", "📧 Interac e-Transfer", "💳 Credit / Debit Card", "🍎 Apple Pay", "🤖 Google Pay"].map((method) => (
            <View key={method} style={styles.paymentChip}>
              <Text style={styles.paymentChipText}>{method}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ─── CONTACT ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📞</Text>
          <Text style={styles.sectionTitle}>Contact Us</Text>
        </View>
        <Pressable
          style={styles.contactRow}
          onPress={() => Linking.openURL("mailto:freshcartcanada@outlook.com")}
        >
          <Text style={styles.contactIcon}>📧</Text>
          <View>
            <Text style={styles.contactLabel}>Email Support</Text>
            <Text style={styles.contactValue}>freshcartcanada@outlook.com</Text>
          </View>
        </Pressable>
      </View>

      {/* ─── ABOUT ─── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>🛒</Text>
          <Text style={styles.sectionTitle}>About FreshCart</Text>
        </View>
        <Text style={styles.aboutText}>
          FreshCart is designed to make grocery shopping faster, easier, and more convenient for you.
        </Text>
        <Text style={styles.aboutText}>
          Enjoy fresh groceries from your favourite local stores delivered straight to your doorstep across Toronto, Oshawa and Barrie.
        </Text>
        <View style={styles.expandBadge}>
          <Text style={styles.expandText}>🚀 Expanding to more cities & provinces soon!</Text>
        </View>
        <Text style={styles.aboutText}>Thank you for choosing FreshCart.</Text>
      </View>

      {/* ─── FOOTER ─── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          <Text style={{ color: "#fff" }}>Fresh</Text>
          <Text style={{ color: "#f5c518" }}>Cart</Text>
          <Text style={{ color: "#fff" }}> v1.0</Text>
        </Text>
        <Text style={styles.footerSub}>Toronto, Oshawa & Barrie Grocery Delivery</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f4f7f5", paddingBottom: 40 },
  header: {
    backgroundColor: "#1a7a2e", paddingTop: 70, paddingBottom: 30,
    alignItems: "center", gap: 6, overflow: "hidden",
  },
  headerAccentBar: {
    position: "absolute", top: 0, left: 0, right: 0, height: 5,
    backgroundColor: "#f5c518",
  },
  logoWrap: {
    width: 70, height: 70, borderRadius: 20,
    backgroundColor: "#f5c518", alignItems: "center", justifyContent: "center",
    shadowColor: "#f5c518", shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  headerEmoji: { fontSize: 38 },
  brandRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  brandFresh: { fontSize: 32, fontWeight: "900", color: "#fff" },
  brandCart: { fontSize: 32, fontWeight: "900", color: "#f5c518" },
  headerSub: { fontSize: 14, color: "#a7f3d0", fontWeight: "500" },
  section: {
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderBottomWidth: 3, borderBottomColor: "#f5c518",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  zoneRow: { flexDirection: "row", gap: 10 },
  zoneCard: {
    flex: 1, backgroundColor: "#f0faf4", borderRadius: 12,
    padding: 12, alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#d1fae5",
  },
  zoneEmoji: { fontSize: 24 },
  zoneCity: { fontSize: 13, fontWeight: "900", color: "#1a7a2e" },
  zoneDetail: { fontSize: 10, color: "#555", textAlign: "center", fontWeight: "600" },
  feeRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  feeCard: {
    flex: 1, backgroundColor: "#f9fafb", borderRadius: 12,
    padding: 14, alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#e8e8e8",
  },
  feeCardFree: { backgroundColor: "#f0faf4", borderColor: "#d1fae5" },
  feeAmount: { fontSize: 18, fontWeight: "900", color: "#111" },
  feeLabel: { fontSize: 12, color: "#666", fontWeight: "600", textAlign: "center" },
  firstOrderBanner: {
    backgroundColor: "#fffbeb", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "#f5c518", alignItems: "center",
  },
  firstOrderText: { color: "#92400e", fontWeight: "800", fontSize: 13 },
  hoursBox: { backgroundColor: "#f9fafb", borderRadius: 12, padding: 14 },
  hoursRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  hoursDay: { fontSize: 14, fontWeight: "700", color: "#333" },
  hoursTime: { fontSize: 14, fontWeight: "700", color: "#1a7a2e" },
  divider: { height: 1, backgroundColor: "#eee" },
  storeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  storeCard: {
    width: "22%", alignItems: "center", gap: 6,
    backgroundColor: "#fafafa", borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: "#eee",
  },
  storeLogo: { width: 48, height: 48, borderRadius: 8 },
  storeName: { fontSize: 10, fontWeight: "700", color: "#444", textAlign: "center" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#f5c518", alignItems: "center", justifyContent: "center",
  },
  stepNumText: { color: "#111", fontWeight: "900", fontSize: 13 },
  stepIcon: { fontSize: 22 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  stepDesc: { fontSize: 12, color: "#666", marginTop: 2, fontWeight: "500" },
  paymentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paymentChip: {
    backgroundColor: "#fffbeb", borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "#f5c518",
  },
  paymentChipText: { fontSize: 13, fontWeight: "600", color: "#333" },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#f0faf4", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#d1fae5",
  },
  contactIcon: { fontSize: 28 },
  contactLabel: { fontSize: 12, color: "#666", fontWeight: "600" },
  contactValue: { fontSize: 14, fontWeight: "800", color: "#1a7a2e", marginTop: 2 },
  aboutText: { fontSize: 14, color: "#555", lineHeight: 22, fontWeight: "500", marginBottom: 10 },
  expandBadge: {
    backgroundColor: "#fffbeb", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#f5c518", marginBottom: 10,
  },
  expandText: { fontSize: 13, fontWeight: "800", color: "#92400e", textAlign: "center" },
  footer: {
    backgroundColor: "#1a7a2e", marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, padding: 20, alignItems: "center", gap: 4,
  },
  footerText: { fontSize: 16, fontWeight: "900" },
  footerSub: { fontSize: 12, color: "#a7f3d0", fontWeight: "500", textAlign: "center" },
});