import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isProductOwnedByCurrentSeller,
  getActiveMode,
  MODES,
} from '../data/businessProfileData';
import {
  isProductActive,
  getProductById,
  subscribeProducts,
} from '../data/products';

export const CART_STORAGE_KEY = '@vyaparsetu_cart';

/**
 * Calculates the applicable per-unit price for a given product and quantity,
 * respecting tiered bulk pricing if configured on the product.
 */
export function getApplicableUnitPrice(product, quantity) {
  if (!product) return 0;
  const qty = Number(quantity) || 0;

  if (Array.isArray(product.bulkPricing) && product.bulkPricing.length > 0 && qty > 0) {
    const matchingTier = product.bulkPricing.find((tier) => {
      const min =
        tier.minQuantity !== null && tier.minQuantity !== undefined
          ? Number(tier.minQuantity)
          : 0;
      const minMatch = qty >= min;
      const maxMatch =
        tier.maxQuantity === null || tier.maxQuantity === undefined
          ? true
          : qty <= Number(tier.maxQuantity);
      return minMatch && maxMatch;
    });

    if (
      matchingTier &&
      matchingTier.pricePerUnit !== undefined &&
      matchingTier.pricePerUnit !== null
    ) {
      return Number(matchingTier.pricePerUnit);
    }
  }

  return product.price !== undefined && product.price !== null
    ? Number(product.price)
    : 0;
}

/**
 * Finds the active bulk pricing tier for a product at a given quantity.
 */
export function getActiveTier(product, quantity) {
  if (!product || !Array.isArray(product.bulkPricing) || product.bulkPricing.length === 0) {
    return null;
  }
  const qty = Number(quantity) || 0;
  if (qty <= 0) return null;

  const found = product.bulkPricing.find((tier) => {
    const min =
      tier.minQuantity !== null && tier.minQuantity !== undefined
        ? Number(tier.minQuantity)
        : 0;
    const minMatch = qty >= min;
    const maxMatch =
      tier.maxQuantity === null || tier.maxQuantity === undefined
        ? true
        : qty <= Number(tier.maxQuantity);
    return minMatch && maxMatch;
  });

  return found || null;
}

/**
 * Returns minimum order quantity (MOQ) for a product (defaults to 1).
 */
export function getProductMoq(product) {
  if (!product) return 1;
  const parsed = Number(product.moq);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Returns maximum available stock for a product, or Infinity if not specified.
 */
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

/**
 * Re-computes unit price, item total, and savings for a product at a quantity.
 */
export function calculateItemValues(product, quantity) {
  const qty = Math.max(1, Number(quantity) || 1);
  const unitPrice = getApplicableUnitPrice(product, qty);
  const itemTotal = qty * unitPrice;
  const regularPrice =
    product && product.price !== undefined && product.price !== null
      ? Number(product.price)
      : unitPrice;
  const savings = Math.max(0, (regularPrice - unitPrice) * qty);
  const activeTier = getActiveTier(product, qty);

  return {
    unitPrice,
    itemTotal,
    savings,
    activeTier,
  };
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
            // Re-validate and re-calculate pricing based on current product definitions
            const sanitized = parsed.map((item) => {
              const product = item.product || {};
              const pId = item.id || product.id;
              const liveProduct = getProductById(pId);
              const isUnavailable = !liveProduct || !isProductActive(liveProduct);
              const resolvedProduct = liveProduct || product;

              const qty = Math.max(1, Number(item.quantity) || 1);
              let values = calculateItemValues(resolvedProduct, qty);
              if (item.quotationId && item.unitPrice) {
                const qPrice = Number(item.unitPrice);
                const regPrice = Number(resolvedProduct.price) || qPrice;
                values = {
                  unitPrice: qPrice,
                  itemTotal: qty * qPrice,
                  savings: Math.max(0, (regPrice - qPrice) * qty),
                  activeTier: values.activeTier,
                };
              }
              return {
                ...item,
                id: item.id || resolvedProduct.id,
                product: resolvedProduct,
                quantity: qty,
                isUnavailable: isUnavailable || Boolean(item.isUnavailable),
                unavailableReason: isUnavailable
                  ? 'This product has been removed by the seller and is no longer available.'
                  : item.unavailableReason || null,
                ...values,
              };
            });
            setCartItems(sanitized);
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

  // 3. Re-validate cart items against product catalog updates (e.g. deletion / archival)
  useEffect(() => {
    return subscribeProducts((updatedProducts) => {
      setCartItems((prevItems) => {
        let changed = false;
        const updated = prevItems.map((item) => {
          const pId = item.id || item.product?.id;
          const liveProduct = updatedProducts.find(
            (p) =>
              String(p?.id || '').trim().toLowerCase() ===
              String(pId || '').trim().toLowerCase()
          );
          const isUnavailable = !liveProduct || !isProductActive(liveProduct);
          if (Boolean(item.isUnavailable) !== isUnavailable) {
            changed = true;
            return {
              ...item,
              product: liveProduct || item.product,
              isUnavailable,
              unavailableReason: isUnavailable
                ? 'This product has been removed by the seller and is no longer available.'
                : null,
            };
          }
          return item;
        });
        return changed ? updated : prevItems;
      });
    });
  }, []);

  /**
   * Adds a product to the cart with the given quantity.
   * If the item already exists in the cart, increases or replaces its quantity.
   * Enforces MOQ and available stock constraints.
   */
  const addToCart = useCallback(
    (product, requestedQuantity = null, options = {}) => {
      if (!product || !product.id) {
        return {
          success: false,
          reason: 'invalid_product',
          message: 'Invalid product details.',
        };
      }

      if (!isProductActive(product)) {
        return {
          success: false,
          reason: 'product_unavailable',
          message: 'This product has been deleted or is no longer available for purchase.',
        };
      }

      if (getActiveMode() === MODES.SELLER) {
        return {
          success: false,
          reason: 'seller_mode',
          message: 'Adding products to cart is disabled in Seller Mode.',
        };
      }

      if (isProductOwnedByCurrentSeller(product)) {
        return {
          success: false,
          reason: 'own_product',
          message: 'You cannot add your own product to your cart.',
        };
      }

      const moq = getProductMoq(product);
      const stock = getProductStock(product);

      if (stock <= 0) {
        return {
          success: false,
          reason: 'out_of_stock',
          message: 'This product is currently out of stock.',
        };
      }

      const existingItem = cartItems.find((item) => item.id === product.id);
      let targetQuantity;

      if (options.replace) {
        targetQuantity =
          requestedQuantity !== null && requestedQuantity !== undefined
            ? Number(requestedQuantity)
            : moq;
      } else if (existingItem) {
        const addedQty =
          requestedQuantity !== null && requestedQuantity !== undefined
            ? Number(requestedQuantity)
            : moq;
        targetQuantity = existingItem.quantity + addedQty;
      } else {
        targetQuantity =
          requestedQuantity !== null && requestedQuantity !== undefined
            ? Number(requestedQuantity)
            : moq;
      }

      targetQuantity = Math.round(targetQuantity);

      // Clamp to MOQ
      if (targetQuantity < moq) {
        targetQuantity = moq;
      }

      // Clamp to Stock
      let clampedToStock = false;
      if (stock !== Infinity && targetQuantity > stock) {
        targetQuantity = stock;
        clampedToStock = true;
      }

      // Re-verify if stock cannot fulfill even MOQ
      if (targetQuantity < moq) {
        return {
          success: false,
          reason: 'stock_below_moq',
          message: `Available stock (${stock}) is lower than minimum order quantity (${moq}).`,
        };
      }

      let values = calculateItemValues(product, targetQuantity);

      // Support custom negotiated quotation unit price
      const customUnitPrice =
        options.unitPrice !== undefined && options.unitPrice !== null
          ? Number(options.unitPrice)
          : existingItem?.quotationId && existingItem?.unitPrice
          ? Number(existingItem.unitPrice)
          : null;

      if (customUnitPrice !== null) {
        const regularPrice = Number(product.price) || customUnitPrice;
        values = {
          unitPrice: customUnitPrice,
          itemTotal: targetQuantity * customUnitPrice,
          savings: Math.max(0, (regularPrice - customUnitPrice) * targetQuantity),
          activeTier: values.activeTier,
        };
      }

      const newItem = {
        id: product.id,
        product: { ...product },
        quantity: targetQuantity,
        ...values,
        quotationId: options.quotationId || existingItem?.quotationId,
        quotationNumber: options.quotationNumber || existingItem?.quotationNumber,
        quotationDetails: options.quotationDetails || existingItem?.quotationDetails,
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
        clampedToStock,
      };
    },
    [cartItems]
  );

  /**
   * Updates the quantity of an existing item in the cart.
   * Clamps within [MOQ, Stock].
   */
  const updateQuantity = useCallback((productId, newQuantity) => {
    if (!productId) return;
    setCartItems((prevItems) => {
      const index = prevItems.findIndex((item) => item.id === productId);
      if (index === -1) return prevItems;

      const item = prevItems[index];
      const moq = getProductMoq(item.product);
      const stock = getProductStock(item.product);

      let qty = Math.round(Number(newQuantity));
      if (isNaN(qty) || qty < moq) {
        qty = moq;
      }
      if (stock !== Infinity && qty > stock) {
        qty = stock;
      }

      let values = calculateItemValues(item.product, qty);
      if (item.quotationId && item.unitPrice) {
        const qPrice = Number(item.unitPrice);
        const regPrice = Number(item.product.price) || qPrice;
        values = {
          unitPrice: qPrice,
          itemTotal: qty * qPrice,
          savings: Math.max(0, (regPrice - qPrice) * qty),
          activeTier: values.activeTier,
        };
      }
      const next = [...prevItems];
      next[index] = {
        ...item,
        quantity: qty,
        ...values,
        updatedAt: new Date().toISOString(),
      };
      return next;
    });
  }, []);

  /**
   * Increases item quantity by step (default 1), clamped to maximum stock.
   */
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

      let values = calculateItemValues(item.product, nextQty);
      if (item.quotationId && item.unitPrice) {
        const qPrice = Number(item.unitPrice);
        const regPrice = Number(item.product.price) || qPrice;
        values = {
          unitPrice: qPrice,
          itemTotal: nextQty * qPrice,
          savings: Math.max(0, (regPrice - qPrice) * nextQty),
          activeTier: values.activeTier,
        };
      }
      return prevItems.map((i) =>
        i.id === productId
          ? {
              ...i,
              quantity: nextQty,
              ...values,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
    });
  }, []);

  /**
   * Decreases item quantity by step (default 1), clamped to MOQ.
   */
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

      let values = calculateItemValues(item.product, nextQty);
      if (item.quotationId && item.unitPrice) {
        const qPrice = Number(item.unitPrice);
        const regPrice = Number(item.product.price) || qPrice;
        values = {
          unitPrice: qPrice,
          itemTotal: nextQty * qPrice,
          savings: Math.max(0, (regPrice - qPrice) * nextQty),
          activeTier: values.activeTier,
        };
      }
      return prevItems.map((i) =>
        i.id === productId
          ? {
              ...i,
              quantity: nextQty,
              ...values,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
    });
  }, []);

  /**
   * Removes an item completely from the cart by its product ID.
   */
  const removeFromCart = useCallback((productId) => {
    if (!productId) return;
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId && item.product?.id !== productId)
    );
  }, []);

  /**
   * Clears all items from the cart.
   */
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  /**
   * Removes any products that belong to the current seller from the cart.
   */
  const removeOwnProducts = useCallback(() => {
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) => !isProductOwnedByCurrentSeller(item.product || item)
      )
    );
  }, []);

  /**
   * Removes any products that are deleted, archived, or marked unavailable from the cart.
   */
  const removeUnavailableProducts = useCallback(() => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => {
        const pId = item.id || item.product?.id;
        const liveProd = getProductById(pId);
        const isUnavail =
          item.isUnavailable || !liveProd || !isProductActive(liveProd);
        return !isUnavail;
      })
    );
  }, []);

  /**
   * Checks whether a product is currently present in the cart.
   */
  const isInCart = useCallback(
    (productId) => {
      if (!productId) return false;
      return cartItems.some(
        (item) => item.id === productId || item.product?.id === productId
      );
    },
    [cartItems]
  );

  /**
   * Retrieves an item from the cart by its product ID.
   */
  const getCartItem = useCallback(
    (productId) => {
      if (!productId) return null;
      return (
        cartItems.find(
          (item) => item.id === productId || item.product?.id === productId
        ) || null
      );
    },
    [cartItems]
  );

  // Derived aggregates
  const cartItemCount = cartItems.length;

  const unavailableCartItems = useMemo(() => {
    return cartItems.filter((item) => {
      if (item.isUnavailable) return true;
      const pId = item.id || item.product?.id;
      const liveProd = getProductById(pId);
      return !liveProd || !isProductActive(liveProd);
    });
  }, [cartItems]);

  const hasUnavailableProducts = unavailableCartItems.length > 0;

  const totalUnits = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.itemTotal) || 0), 0);
  }, [cartItems]);

  const totalSavings = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.savings) || 0), 0);
  }, [cartItems]);

  const totalAmount = subtotal;

  const value = useMemo(
    () => ({
      cartItems,
      cartItemCount,
      unavailableCartItems,
      hasUnavailableProducts,
      totalUnits,
      subtotal,
      totalSavings,
      totalAmount,
      isLoaded,
      addToCart,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      removeOwnProducts,
      removeUnavailableProducts,
      isInCart,
      getCartItem,
    }),
    [
      cartItems,
      cartItemCount,
      unavailableCartItems,
      hasUnavailableProducts,
      totalUnits,
      subtotal,
      totalSavings,
      totalAmount,
      isLoaded,
      addToCart,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      removeOwnProducts,
      removeUnavailableProducts,
      isInCart,
      getCartItem,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Hook to consume the CartContext with safe fallbacks.
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    return {
      cartItems: [],
      cartItemCount: 0,
      unavailableCartItems: [],
      hasUnavailableProducts: false,
      totalUnits: 0,
      subtotal: 0,
      totalSavings: 0,
      totalAmount: 0,
      isLoaded: true,
      addToCart: () => ({ success: false, reason: 'no_provider' }),
      updateQuantity: () => {},
      increaseQuantity: () => {},
      decreaseQuantity: () => {},
      removeFromCart: () => {},
      clearCart: () => {},
      removeOwnProducts: () => {},
      removeUnavailableProducts: () => {},
      isInCart: () => false,
      getCartItem: () => null,
    };
  }
  return context;
}

export default CartContext;

