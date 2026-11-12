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

export function getProductMoq(product) {
  if (!product) return 1;
  const parsed = Number(product.moq);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
}

export function getProductStock(product) {
  if (!product) return Infinity;
  const rawStock =
    product.stock !== undefined
      ? product.stock
      : product.availableQuantity !== undefined
      ? product.availableQuantity
      : null;

  if (rawStock === null || rawStock === undefined) return Infinity;
  const parsed = Number(rawStock);
  return !isNaN(parsed) && parsed >= 0 ? parsed : Infinity;
}
  if (!product) return 1;
  const parsed = Number(product.moq);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
}

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
      const moq = getProductMoq(product);
      const stock = getProductStock(product);

      if (stock <= 0) {
        return {
          success: false,
          reason: 'out_of_stock',
          message: 'This product is currently out of stock.',
        };
      }

      let targetQuantity = options.replace
        ? (requestedQuantity !== null && requestedQuantity !== undefined ? Number(requestedQuantity) : moq)
        : existingItem
        ? existingItem.quantity + (requestedQuantity !== null && requestedQuantity !== undefined ? Number(requestedQuantity) : moq)
        : (requestedQuantity !== null && requestedQuantity !== undefined ? Number(requestedQuantity) : moq);

      targetQuantity = Math.round(targetQuantity);
      if (targetQuantity < moq) {
        targetQuantity = moq;
      }

      let clampedToStock = false;
      if (stock !== Infinity && targetQuantity > stock) {
        targetQuantity = stock;
        clampedToStock = true;
      }

      if (targetQuantity < moq) {
        return {
          success: false,
          reason: 'stock_below_moq',
          message: `Available stock (${stock}) is lower than minimum order quantity (${moq}).`,
        };
      }

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

      const stock = getProductStock(item.product);
      if (stock !== Infinity && item.quantity >= stock) {
        return prevItems; // Already at max stock
      }

      const increment = Math.max(1, Math.round(Number(step) || 1));
      let nextQty = item.quantity + increment;
      if (stock !== Infinity && nextQty > stock) {
        nextQty = stock;
      }
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

      const moq = getProductMoq(item.product);
      if (item.quantity <= moq) {
        return prevItems; // Cannot decrease below MOQ
      }
      const decrement = Math.max(1, Math.round(Number(step) || 1));
      let nextQty = item.quantity - decrement;
      if (nextQty < moq) {
        nextQty = moq;
      }
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
