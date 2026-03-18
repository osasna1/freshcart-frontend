import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "freshcart_cart";
const PRODUCTS_KEY = "freshcart_products";

export const CartStore = {
  async getCart(): Promise<Record<string, number>> {
    try {
      const val = await AsyncStorage.getItem(CART_KEY);
      return val ? JSON.parse(val) : {};
    } catch {
      return {};
    }
  },

  async setCart(cart: Record<string, number>): Promise<void> {
    try {
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  },

  async clearCart(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CART_KEY);
    } catch {}
  },

  async getProducts(): Promise<any[]> {
    try {
      const val = await AsyncStorage.getItem(PRODUCTS_KEY);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  },

  async setProducts(products: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch {}
  },
};