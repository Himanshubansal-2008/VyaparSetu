import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = AsyncStorage.default || AsyncStorage;

export const STORAGE_KEY_ORDERS = '@vyaparsetu_orders';
export const STORAGE_KEY_ADDRESS = '@vyaparsetu_delivery_address';

/**
 * Standard progression stages for B2B wholesale consignments.
 */
export const ORDER_STAGES = [
  {
    key: 'Confirmed',
    label: 'Order Confirmed',
    description: 'Supplier accepted the order and issued proforma invoice',
    icon: 'checkmark-circle-outline',
  },
  {
    key: 'Processing',
    label: 'Processing & Packed',
    description: 'Wholesale batch packed and quality checked at warehouse',
    icon: 'cube-outline',
  },
  {
    key: 'Dispatched',
    label: 'Dispatched',
    description: 'Consignment handed over to freight logistics carrier',
    icon: 'airplane-outline',
  },
  {
    key: 'Out for Delivery',
    label: 'Out for Delivery',
    description: 'Transport vehicle dispatched for final warehouse/dock delivery',
    icon: 'car-outline',
  },
  {
    key: 'Delivered',
    label: 'Delivered',
    description: 'Consignment received and delivery sign-off complete',
    icon: 'checkmark-done-circle-outline',
  },
];

/**
 * Default previous orders to provide immediate buyer order history on initial launch.
 */
export const DEFAULT_SEED_ORDERS = [
  {
    id: 'VS-M1K9P2-4018',
    orderNumber: 'VS-M1K9P2-4018',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Dispatched',
    carrierName: 'Delhivery B2B Freight',
    trackingNumber: 'DELHIVERY-B2B-894102',
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    items: [
      {
        productId: 'prod-002',
        title: 'Wireless Bluetooth Earphones',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
        category: 'Electronics',
        unit: 'piece',
        quantity: 25,
        unitPrice: 480,
        originalPrice: 650,
        itemTotal: 12000,
        activeTier: { minQuantity: 20, maxQuantity: 49, pricePerUnit: 480 },
        savings: 4250,
      },
    ],
    totalItems: 1,
    totalUnits: 25,
    subtotal: 12000,
    totalSavings: 4250,
    totalAmount: 12000,
    deliveryAddress: {
      fullName: 'Rajesh Kumar',
      businessName: 'Kumar Electronics & Retail',
      phone: '9876543210',
      streetAddress: 'Plot 42, GIDC Electronic Zone, Gandhinagar Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
      gstin: '24AAECK1234F1Z5',
    },
    paymentMethod: 'Trade Credit / RTGS / NEFT',
    orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  },
  {
    id: 'VS-M1D7J4-2915',
    orderNumber: 'VS-M1D7J4-2915',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Delivered',
    carrierName: 'Gati-KWE Supply Chain',
    trackingNumber: 'GATI-KWE-552140',
    deliveredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    items: [
      {
        productId: 'prod-001',
        title: 'Handwoven Cotton Tote Bag',
        image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600',
        category: 'Clothing',
        unit: 'piece',
        quantity: 50,
        unitPrice: 160,
        originalPrice: 220,
        itemTotal: 8000,
        activeTier: { minQuantity: 50, maxQuantity: 99, pricePerUnit: 160 },
        savings: 3000,
      },
      {
        productId: 'prod-003',
        title: 'Jaipur Blue Pottery Ceramic Vase',
        image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600',
        category: 'Handicrafts',
        unit: 'piece',
        quantity: 15,
        unitPrice: 320,
        originalPrice: 420,
        itemTotal: 4800,
        activeTier: { minQuantity: 10, maxQuantity: 49, pricePerUnit: 320 },
        savings: 1500,
      },
    ],
    totalItems: 2,
    totalUnits: 65,
    subtotal: 12800,
    totalSavings: 4500,
    totalAmount: 12800,
    deliveryAddress: {
      fullName: 'Rajesh Kumar',
      businessName: 'Kumar Handicrafts & Emporium',
      phone: '9876543210',
      streetAddress: 'Shop 14, Commercial Complex, Ring Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
      gstin: '24AAECK1234F1Z5',
    },
    paymentMethod: 'Cash on Delivery (COD)',
    orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  },
];

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
 * Returns stage index (0 to 4) for visual progress timeline.
 * Returns -1 if cancelled.
 */
export const getStatusProgress = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'cancelled') return -1;
  const index = ORDER_STAGES.findIndex(
    (s) => s.key.toLowerCase() === normalized
  );
  return index >= 0 ? index : 0;
};

/**
 * Returns color tokens and icons for order status badge.
 */
export const getStatusColor = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  switch (normalized) {
    case 'delivered':
      return {
        bg: '#D1FAE5',
        text: '#065F46',
        border: '#10B981',
        icon: 'checkmark-circle-outline',
      };
    case 'dispatched':
    case 'in transit':
      return {
        bg: '#E0E7FF',
        text: '#3730A3',
        border: '#6366F1',
        icon: 'airplane-outline',
      };
    case 'out for delivery':
      return {
        bg: '#CCFBF1',
        text: '#115E59',
        border: '#14B8A6',
        icon: 'car-outline',
      };
    case 'processing':
    case 'in production':
      return {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#F59E0B',
        icon: 'cube-outline',
      };
    case 'cancelled':
      return {
        bg: '#FEE2E2',
        text: '#991B1B',
        border: '#EF4444',
        icon: 'close-circle-outline',
      };
    case 'confirmed':
    default:
      return {
        bg: '#DBEAFE',
        text: '#1E40AF',
        border: '#3B82F6',
        icon: 'receipt-outline',
      };
  }
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
 * Seeds initial mock previous orders if storage is empty.
 */
export const loadPersistedOrders = async () => {
  try {
    const raw = await storage.getItem(STORAGE_KEY_ORDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOrders = parsed;
        notifyOrderListeners();
        return inMemoryOrders;
      }
    }
    // If not in storage yet, seed initial mock orders and save
    inMemoryOrders = [...DEFAULT_SEED_ORDERS];
    await storage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(inMemoryOrders));
    notifyOrderListeners();
    return inMemoryOrders;
  } catch (error) {
    console.warn('[orders] Failed to load persisted orders:', error);
  }
  if (!inMemoryOrders.length) {
    inMemoryOrders = [...DEFAULT_SEED_ORDERS];
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
 * Returns a specific order by ID or orderNumber.
 */
export const getOrderById = (orderId) => {
  if (!orderId) return null;
  const cleanId = String(orderId).trim().toLowerCase();
  return (
    inMemoryOrders.find(
      (o) =>
        String(o.id || '').trim().toLowerCase() === cleanId ||
        String(o.orderNumber || '').trim().toLowerCase() === cleanId
    ) || null
  );
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
    orderDate:
      orderData.orderDate ||
      new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
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
 * Updates an existing order's status and persists to AsyncStorage.
 */
export const updateOrderStatus = async (orderId, newStatus, extraData = {}) => {
  if (!orderId || !newStatus) return null;
  const cleanId = String(orderId).trim().toLowerCase();
  let updatedOrder = null;

  inMemoryOrders = inMemoryOrders.map((order) => {
    if (
      String(order.id || '').trim().toLowerCase() === cleanId ||
      String(order.orderNumber || '').trim().toLowerCase() === cleanId
    ) {
      updatedOrder = {
        ...order,
        ...extraData,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      return updatedOrder;
    }
    return order;
  });

  if (updatedOrder) {
    notifyOrderListeners();
    try {
      await storage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(inMemoryOrders));
    } catch (error) {
      console.warn('[orders] Failed to persist updated order status:', error);
    }
  }

  return updatedOrder;
};

/**
 * Resets orders back to seed orders (useful for demo/testing).
 */
export const resetOrders = async () => {
  inMemoryOrders = [...DEFAULT_SEED_ORDERS];
  try {
    await storage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(inMemoryOrders));
    notifyOrderListeners();
  } catch (error) {
    console.warn('[orders] Failed to reset orders:', error);
  }
  return inMemoryOrders;
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
  ORDER_STAGES,
  DEFAULT_SEED_ORDERS,
  generateOrderId,
  loadPersistedOrders,
  getOrders,
  getOrderById,
  saveOrder,
  updateOrderStatus,
  resetOrders,
  getStatusProgress,
  getStatusColor,
  loadPersistedAddress,
  getSavedAddress,
  saveDeliveryAddress,
  subscribeOrders,
};
