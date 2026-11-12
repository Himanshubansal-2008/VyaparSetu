import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

  const addToCart = useCallback(
    (product, requestedQuantity = null, options = {}) => {
      if (!product || !product.id) {
        return {
          success: false,
          reason: 'invalid_product',
          message: 'Invalid product details.',
        };
      }

      const existingItem = cartItems.find((item) => item.id === product.id);
      const targetQuantity = options.replace
        ? (Number(requestedQuantity) || 1)
        : existingItem
        ? existingItem.quantity + (Number(requestedQuantity) || 1)
        : (Number(requestedQuantity) || 1);

      const unitPrice = Number(product.price) || 0;
      const newItem = {
        id: product.id,
        product: { ...product },
        quantity: targetQuantity,
        unitPrice,
        itemTotal: targetQuantity * unitPrice,
        addedAt: existingItem?.addedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCartItems((prevItems) => {
        const index = prevItems.findIndex((item) => item.id === product.id);
        if (index >= 0) {
          const next = [...prevItems];
          next[index] = newItem;
          return next;
        }
        return [...prevItems, newItem];
      });

      return {
        success: true,
        item: newItem,
        isNew: !existingItem,
      };
    },
    [cartItems]
  );

  const increaseQuantity = useCallback((productId, step = 1) => {
    if (!productId) return;
    setCartItems((prevItems) => {
      const item = prevItems.find((i) => i.id === productId);
      if (!item) return prevItems;

      const increment = Math.max(1, Math.round(Number(step) || 1));
      const nextQty = item.quantity + increment;
      const unitPrice = item.unitPrice || Number(item.product?.price) || 0;

      return prevItems.map((i) =>
        i.id === productId
          ? {
              ...i,
              quantity: nextQty,
              itemTotal: nextQty * unitPrice,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
    });
  }, []);

  const decreaseQuantity = useCallback((productId, step = 1) => {
    if (!productId) return;
    setCartItems((prevItems) => {
      const item = prevItems.find((i) => i.id === productId);
      if (!item) return prevItems;

      const decrement = Math.max(1, Math.round(Number(step) || 1));
      const nextQty = Math.max(1, item.quantity - decrement);
      const unitPrice = item.unitPrice || Number(item.product?.price) || 0;

      return prevItems.map((i) =>
        i.id === productId
          ? {
              ...i,
              quantity: nextQty,
              itemTotal: nextQty * unitPrice,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    if (!productId) return;
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId && item.product?.id !== productId)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const isInCart = useCallback(
    (productId) => {
      if (!productId) return false;
      return cartItems.some(
        (item) => item.id === productId || item.product?.id === productId
      );
    },
    [cartItems]
  );

  const cartItemCount = cartItems.length;

  const value = useMemo(
    () => ({
      cartItems,
      cartItemCount,
      isLoaded,
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      isInCart,
    }),
    [cartItems, cartItemCount, isLoaded, addToCart, isInCart]
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
      addToCart: () => ({ success: false, reason: 'no_provider' }),
      increaseQuantity: () => {},
      decreaseQuantity: () => {},
      removeFromCart: () => {},
      clearCart: () => {},
      isInCart: () => false,
    };
  }
  return context;
}

export default CartContext;
