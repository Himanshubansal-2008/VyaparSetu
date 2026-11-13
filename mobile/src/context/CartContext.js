import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isProductOwnedByCurrentSeller,
  getActiveMode,
  MODES,
  getSessionBusinessProfile,
} from '../data/businessProfileData';
import {
  isProductActive,
  getProductById,
  subscribeProducts,
} from '../data/products';
import { isUUID } from '../services/productService';
import cartService, {
  fetchBackendCart,
  addBackendCartItem,
  updateBackendCartQuantity,
  removeBackendCartItem,
  clearBackendCart,
  migrateBackendCart,
  resolveProductId,
} from '../services/cartService';

const isEligibleForBackend = (id) => {
  if (!id) return false;
  const resolved = resolveProductId(id);
  return isUUID(resolved);
};

import {
  getApplicableUnitPrice,
  getActiveTier,
  getProductMoq,
  getProductStock,
  calculateItemValues,
  normalizeBackendCartItem,
} from '../utils/cartPricing';

export {
  getApplicableUnitPrice,
  getActiveTier,
  getProductMoq,
  getProductStock,
  calculateItemValues,
  normalizeBackendCartItem,
};

export const CART_STORAGE_KEY = '@vyaparsetu_cart';

export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isSyncingRef = useRef(false);

  // Synchronizes local cart items with the backend cart
  const syncWithBackend = useCallback(async (currentLocalItems = null) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const itemsToConsider = currentLocalItems || cartItems;
      const backendCart = await fetchBackendCart().catch(() => null);

      if (backendCart && Array.isArray(backendCart.items)) {
        if (backendCart.items.length === 0 && itemsToConsider.length > 0) {
          // If backend cart is empty but we have local items, migrate them
          const eligibleToMigrate = itemsToConsider.filter(
            (item) => item && (isUUID(item.productId || item.product?.id || item.id) || isEligibleForBackend(item.productId || item.product?.id || item.id))
          );

          if (eligibleToMigrate.length > 0) {
            const migrationRes = await migrateBackendCart(eligibleToMigrate).catch(() => null);
            if (migrationRes && Array.isArray(migrationRes.items)) {
              const mapped = migrationRes.items.map((bItem) => {
                const bProdId = bItem.productId || bItem.product?.id;
                const existing = itemsToConsider.find((l) => {
                  const lProdId = l.productId || l.id || l.product?.id;
                  return lProdId === bProdId || resolveProductId(lProdId) === bProdId;
                });
                return normalizeBackendCartItem(bItem, existing);
              }).filter(Boolean);

              // Keep items that are neither UUID nor eligible for backend
              const nonUuidItems = itemsToConsider.filter(
                (item) => item && !isUUID(item.productId || item.product?.id || item.id) && !isEligibleForBackend(item.productId || item.product?.id || item.id)
              );

              setCartItems([...mapped, ...nonUuidItems]);
              return;
            }
          }
        }

        // Reconcile backend cart items
        const mappedBackend = backendCart.items.map((bItem) => {
          const bProdId = bItem.productId || bItem.product?.id;
          const existing = itemsToConsider.find((l) => {
            const lProdId = l.productId || l.id || l.product?.id;
            return lProdId === bProdId || resolveProductId(lProdId) === bProdId;
          });
          return normalizeBackendCartItem(bItem, existing);
        }).filter(Boolean);

        // Preserve items that are neither UUID nor eligible for backend
        const nonUuidItems = itemsToConsider.filter(
          (item) => item && !isUUID(item.productId || item.product?.id || item.id) && !isEligibleForBackend(item.productId || item.product?.id || item.id)
        );

        setCartItems([...mappedBackend, ...nonUuidItems]);
      }
    } catch (err) {
      console.warn('[CartContext] Backend sync deferred:', err.message || err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [cartItems]);

  // 1. Load persisted cart data on initial mount and then sync with backend
  useEffect(() => {
    let isMounted = true;
    async function loadCart() {
      let initialItems = [];
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            // Re-validate and re-calculate pricing based on current product definitions
            initialItems = parsed.map((item) => {
              const product = item.product || {};
              const pId = item.id || product.id || item.productId;
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
                id: pId,
                productId: pId,
                product: resolvedProduct,
                quantity: qty,
                isUnavailable: isUnavailable || Boolean(item.isUnavailable),
                unavailableReason: isUnavailable
                  ? 'This product has been removed by the seller and is no longer available.'
                  : item.unavailableReason || null,
                ...values,
              };
            });
            if (isMounted) {
              setCartItems(initialItems);
            }
          }
        }
      } catch (err) {
        console.warn('[CartContext] Error loading cart from storage:', err);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
          // Sync with backend in background without blocking initial render
          syncWithBackend(initialItems);
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
          const pId = item.id || item.product?.id || item.productId;
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
   * Enforces MOQ, stock constraints, Buyer Mode, and own-product purchase prevention.
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

      const productId = product.id;
      const existingItem = cartItems.find(
        (item) => item.id === productId || item.product?.id === productId
      );

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
        id: productId,
        productId,
        product: { ...product },
        quantity: targetQuantity,
        ...values,
        quotationId: options.quotationId || existingItem?.quotationId,
        quotationNumber: options.quotationNumber || existingItem?.quotationNumber,
        quotationDetails: options.quotationDetails || existingItem?.quotationDetails,
        addedAt: existingItem?.addedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Optimistic local update
      setCartItems((prevItems) => {
        const index = prevItems.findIndex(
          (item) => item.id === productId || item.product?.id === productId
        );
        if (index >= 0) {
          const next = [...prevItems];
          next[index] = newItem;
          return next;
        }
        return [...prevItems, newItem];
      });

      // 2. Asynchronous backend synchronization if UUID or eligible
      if (isUUID(productId) || isEligibleForBackend(productId)) {
        addBackendCartItem(productId, targetQuantity, { replace: true })
          .then((backendCart) => {
            if (backendCart && Array.isArray(backendCart.items)) {
              setCartItems((prevItems) => {
                const mappedBackend = backendCart.items.map((bItem) => {
                  const bProdId = bItem.productId || bItem.product?.id;
                  const existing = prevItems.find((l) => {
                    const lProdId = l.productId || l.id || l.product?.id;
                    return lProdId === bProdId || resolveProductId(lProdId) === bProdId;
                  });
                  return normalizeBackendCartItem(bItem, existing);
                }).filter(Boolean);

                const nonUuidItems = prevItems.filter(
                  (item) => item && !isUUID(item.productId || item.product?.id || item.id) && !isEligibleForBackend(item.productId || item.product?.id || item.id)
                );
                return [...mappedBackend, ...nonUuidItems];
              });
            }
          })
          .catch((err) => {
            if (err?.statusCode === 403) {
              // Ownership rejection from backend
              Alert.alert(
                'Action Not Allowed',
                err.data?.message || 'You cannot add your own product to your wholesale cart.'
              );
              // Roll back local addition
              setCartItems((prev) =>
                prev.filter((i) => i.id !== productId && i.product?.id !== productId)
              );
            } else if (err?.statusCode === 400) {
              Alert.alert('Unable to Add to Cart', err.data?.message || err.message);
              // Roll back local addition on validation rejection
              setCartItems((prev) =>
                prev.filter((i) => i.id !== productId && i.product?.id !== productId)
              );
            } else {
              console.warn('[CartContext] addBackendCartItem failed (offline):', err.message || err);
            }
          });
      }

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

    let finalQty = 1;
    setCartItems((prevItems) => {
      const index = prevItems.findIndex(
        (item) => item.id === productId || item.product?.id === productId
      );
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
      finalQty = qty;

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

    // Backend sync if UUID or eligible
    if (isUUID(productId) || isEligibleForBackend(productId)) {
      updateBackendCartQuantity(productId, finalQty)
        .then((backendCart) => {
          if (backendCart && Array.isArray(backendCart.items)) {
            setCartItems((prevItems) => {
              const mappedBackend = backendCart.items.map((bItem) => {
                const bProdId = bItem.productId || bItem.product?.id;
                const existing = prevItems.find((l) => {
                  const lProdId = l.productId || l.id || l.product?.id;
                  return lProdId === bProdId || resolveProductId(lProdId) === bProdId;
                });
                return normalizeBackendCartItem(bItem, existing);
              }).filter(Boolean);

              const nonUuidItems = prevItems.filter(
                (item) => item && !isUUID(item.productId || item.product?.id || item.id) && !isEligibleForBackend(item.productId || item.product?.id || item.id)
              );
              return [...mappedBackend, ...nonUuidItems];
            });
          }
        })
        .catch((err) => {
          console.warn('[CartContext] updateBackendCartQuantity deferred:', err.message || err);
        });
    }
  }, []);

  /**
   * Increases item quantity by step (default 1), clamped to maximum stock.
   */
  const increaseQuantity = useCallback((productId, step = 1) => {
    if (!productId) return;

    let targetQty = null;
    setCartItems((prevItems) => {
      const item = prevItems.find(
        (i) => i.id === productId || i.product?.id === productId
      );
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
      targetQty = nextQty;

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
        i.id === productId || i.product?.id === productId
          ? {
              ...i,
              quantity: nextQty,
              ...values,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
    });

    if (targetQty !== null && (isUUID(productId) || isEligibleForBackend(productId))) {
      updateBackendCartQuantity(productId, targetQty).catch((err) =>
        console.warn('[CartContext] increaseQuantity sync deferred:', err.message || err)
      );
    }
  }, []);

  /**
   * Decreases item quantity by step (default 1), clamped to MOQ.
   */
  const decreaseQuantity = useCallback((productId, step = 1) => {
    if (!productId) return;

    let targetQty = null;
    setCartItems((prevItems) => {
      const item = prevItems.find(
        (i) => i.id === productId || i.product?.id === productId
      );
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
      targetQty = nextQty;

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
        i.id === productId || i.product?.id === productId
          ? {
              ...i,
              quantity: nextQty,
              ...values,
              updatedAt: new Date().toISOString(),
            }
          : i
      );
    });

    if (targetQty !== null && (isUUID(productId) || isEligibleForBackend(productId))) {
      updateBackendCartQuantity(productId, targetQty).catch((err) =>
        console.warn('[CartContext] decreaseQuantity sync deferred:', err.message || err)
      );
    }
  }, []);

  /**
   * Removes an item completely from the cart by its product ID.
   */
  const removeFromCart = useCallback((productId) => {
    if (!productId) return;

    // Optimistic local update
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId && item.product?.id !== productId)
    );

    // Backend sync if UUID or eligible
    if (isUUID(productId) || isEligibleForBackend(productId)) {
      removeBackendCartItem(productId).catch((err) =>
        console.warn('[CartContext] removeBackendCartItem deferred:', err.message || err)
      );
    }
  }, []);

  /**
   * Clears all items from the cart.
   */
  const clearCart = useCallback(() => {
    // Optimistic local update
    setCartItems([]);

    // Backend sync
    clearBackendCart().catch((err) =>
      console.warn('[CartContext] clearBackendCart deferred:', err.message || err)
    );
  }, []);

  /**
   * Removes any products that belong to the current seller from the cart.
   */
  const removeOwnProducts = useCallback(() => {
    const sessionProfile = getSessionBusinessProfile();
    setCartItems((prevItems) => {
      const ownItems = prevItems.filter((item) =>
        isProductOwnedByCurrentSeller(item.product || item, sessionProfile)
      );

      // Async remove each on backend if UUID or eligible
      ownItems.forEach((item) => {
        const pId = item.productId || item.product?.id || item.id;
        if (isUUID(pId) || isEligibleForBackend(pId)) {
          removeBackendCartItem(pId).catch(() => {});
        }
      });

      return prevItems.filter(
        (item) => !isProductOwnedByCurrentSeller(item.product || item, sessionProfile)
      );
    });
  }, []);

  /**
   * Removes any products that are deleted, archived, or marked unavailable from the cart.
   */
  const removeUnavailableProducts = useCallback(() => {
    setCartItems((prevItems) => {
      const unavail = prevItems.filter((item) => {
        const pId = item.id || item.product?.id;
        const liveProd = getProductById(pId);
        return item.isUnavailable || !liveProd || !isProductActive(liveProd);
      });

      unavail.forEach((item) => {
        const pId = item.productId || item.product?.id || item.id;
        if (isUUID(pId) || isEligibleForBackend(pId)) {
          removeBackendCartItem(pId).catch(() => {});
        }
      });

      return prevItems.filter((item) => {
        const pId = item.id || item.product?.id;
        const liveProd = getProductById(pId);
        return !item.isUnavailable && liveProd && isProductActive(liveProd);
      });
    });
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
      syncWithBackend,
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
      syncWithBackend,
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
      syncWithBackend: () => Promise.resolve(),
    };
  }
  return context;
}

export default CartContext;
