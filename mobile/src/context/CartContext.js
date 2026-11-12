import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CART_STORAGE_KEY = '@vyaparsetu_cart';

export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load persisted cart data on initial mount
  useEffect(() => {
    let isMounted = true;
    async function loadCart() {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCartItems(parsed);
          }
        }
      } catch (err) {
        console.warn('[CartContext] Error loading cart from storage:', err);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    loadCart();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Persist cart data whenever items change (after initial hydration)
  useEffect(() => {
    if (!isLoaded) return;
    async function saveCart() {
      try {
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
      } catch (err) {
        console.warn('[CartContext] Error saving cart to storage:', err);
      }
    }
    saveCart();
  }, [cartItems, isLoaded]);

  const cartItemCount = cartItems.length;

  const value = useMemo(
    () => ({
      cartItems,
      cartItemCount,
      isLoaded,
    }),
    [cartItems, cartItemCount, isLoaded]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    return {
      cartItems: [],
      cartItemCount: 0,
      isLoaded: true,
    };
  }
  return context;
}

export default CartContext;
