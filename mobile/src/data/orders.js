import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = AsyncStorage.default || AsyncStorage;

export const STORAGE_KEY_ORDERS = '@vyaparsetu_orders';
export const STORAGE_KEY_ADDRESS = '@vyaparsetu_delivery_address';

let inMemoryOrders = [];
let inMemoryAddress = null;
const orderListeners = new Set();

const notifyOrderListeners = () => {
  orderListeners.forEach((listener) => {
    try {
      listener([...inMemoryOrders]);
    } catch (e) {
      console.warn('[orders] Error notifying listener:', e);
    }
  });
};

export const subscribeOrders = (listener) => {
  if (typeof listener === 'function') {
    orderListeners.add(listener);
    listener([...inMemoryOrders]);
    return () => orderListeners.delete(listener);
  }
  return () => {};
};

/**
 * Generates a clean, unique wholesale order identifier.
 * Example format: VS-M1AB2C-7892
 */
export const generateOrderId = () => {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `VS-${timestampPart}-${randomSuffix}`;
};

/**
 * Loads orders from AsyncStorage on startup.
 */
export const loadPersistedOrders = async () => {
  try {
    const raw = await storage.getItem(STORAGE_KEY_ORDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryOrders = parsed;
        notifyOrderListeners();
        return inMemoryOrders;
      }
    }
  } catch (error) {
    console.warn('[orders] Failed to load persisted orders:', error);
  }
  return inMemoryOrders;
};

/**
 * Returns all placed orders.
 */
export const getOrders = () => {
  return [...inMemoryOrders];
};

/**
 * Returns a specific order by ID.
 */
export const getOrderById = (orderId) => {
  if (!orderId) return null;
  const cleanId = String(orderId).trim().toLowerCase();
  return inMemoryOrders.find(
    (o) => String(o.id).trim().toLowerCase() === cleanId
  ) || null;
};

/**
 * Saves a new placed order locally in memory and AsyncStorage.
 */
export const saveOrder = async (orderData) => {
  if (!orderData) return null;

  const orderId = orderData.id || generateOrderId();
  const newOrder = {
    ...orderData,
    id: orderId,
    orderNumber: orderId,
    createdAt: orderData.createdAt || new Date().toISOString(),
    status: orderData.status || 'Confirmed',
  };

  inMemoryOrders = [newOrder, ...inMemoryOrders.filter((o) => o.id !== orderId)];
  notifyOrderListeners();

  try {
    await storage.setItem(
      STORAGE_KEY_ORDERS,
      JSON.stringify(inMemoryOrders)
    );
  } catch (error) {
    console.warn('[orders] Failed to persist orders:', error);
  }

  return newOrder;
};

/**
 * Loads previously saved buyer delivery address from AsyncStorage.
 */
export const loadPersistedAddress = async () => {
  try {
    const raw = await storage.getItem(STORAGE_KEY_ADDRESS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryAddress = parsed;
        return inMemoryAddress;
      }
    }
  } catch (error) {
    console.warn('[orders] Failed to load saved address:', error);
  }
  return inMemoryAddress;
};

/**
 * Returns the currently cached buyer address.
 */
export const getSavedAddress = () => {
  return inMemoryAddress;
};

/**
 * Saves or updates buyer delivery address in memory and AsyncStorage.
 */
export const saveDeliveryAddress = async (addressData) => {
  if (!addressData || typeof addressData !== 'object') return null;

  inMemoryAddress = {
    ...addressData,
    updatedAt: new Date().toISOString(),
  };

  try {
    await storage.setItem(
      STORAGE_KEY_ADDRESS,
      JSON.stringify(inMemoryAddress)
    );
  } catch (error) {
    console.warn('[orders] Failed to persist delivery address:', error);
  }

  return inMemoryAddress;
};

export default {
  STORAGE_KEY_ORDERS,
  STORAGE_KEY_ADDRESS,
  generateOrderId,
  loadPersistedOrders,
  getOrders,
  getOrderById,
  saveOrder,
  loadPersistedAddress,
  getSavedAddress,
  saveDeliveryAddress,
  subscribeOrders,
};
