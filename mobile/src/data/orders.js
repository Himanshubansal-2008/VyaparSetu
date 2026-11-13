import AsyncStorage from '@react-native-async-storage/async-storage';
import { isProductOwnedByCurrentSeller } from './businessProfileData.js';

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
 * Permitted status transitions for wholesale order workflow.
 * Strictly prevents illegal status jumps.
 */
export const VALID_STATUS_TRANSITIONS = {
  Confirmed: ['Processing', 'Rejected', 'Cancelled'],
  'Pending Acceptance': ['Processing', 'Confirmed', 'Rejected', 'Cancelled'],
  Processing: ['Dispatched', 'Cancelled'],
  Dispatched: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Rejected: [],
  Cancelled: [],
};

/**
 * Validates whether transitioning from currentStatus to targetStatus is allowed.
 */
export const canTransitionStatus = (currentStatus, targetStatus) => {
  if (!targetStatus) return false;
  const currentKey = Object.keys(VALID_STATUS_TRANSITIONS).find(
    (k) => k.toLowerCase() === String(currentStatus || 'Confirmed').trim().toLowerCase()
  );
  if (!currentKey) return false;
  const allowed = VALID_STATUS_TRANSITIONS[currentKey] || [];
  return allowed.some(
    (s) => s.toLowerCase() === String(targetStatus).trim().toLowerCase()
  );
};

/**
 * Default seed orders providing immediate buyer and seller history on initial launch.
 */
export const DEFAULT_SEED_ORDERS = [
  {
    id: 'VS-M1S8R3-5201',
    orderNumber: 'VS-M1S8R3-5201',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'Confirmed',
    items: [
      {
        productId: 'prod-008',
        title: 'Handcrafted Wooden Wall Hanging',
        name: 'Handcrafted Wooden Wall Hanging',
        image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600',
        category: 'Handicrafts',
        unit: 'piece',
        quantity: 20,
        unitPrice: 280,
        originalPrice: 400,
        itemTotal: 5600,
        sellerId: 'biz-sharma-handicrafts',
        sellerName: 'Sharma Handicrafts',
        activeTier: { minQuantity: 15, maxQuantity: 49, pricePerUnit: 280 },
        savings: 2400,
      },
      {
        productId: 'prod-001',
        title: 'Handwoven Cotton Tote Bag',
        name: 'Handwoven Cotton Tote Bag',
        image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600',
        category: 'Clothing',
        unit: 'piece',
        quantity: 30,
        unitPrice: 160,
        originalPrice: 220,
        itemTotal: 4800,
        sellerId: 'biz-001',
        sellerName: 'Shree Handloom Works',
        activeTier: { minQuantity: 10, maxQuantity: 49, pricePerUnit: 160 },
        savings: 1800,
      },
    ],
    totalItems: 2,
    totalUnits: 50,
    subtotal: 10400,
    totalSavings: 4200,
    totalAmount: 10400,
    deliveryAddress: {
      fullName: 'Vikram Patel',
      businessName: 'Patel Wholesale & Retail Mart',
      phone: '9825012345',
      streetAddress: 'Warehouse 12, GIDC Commercial Hub',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380009',
      gstin: '24AAACP9876K1Z2',
    },
    paymentMethod: 'Trade Credit / RTGS / NEFT',
    orderDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  },
  {
    id: 'VS-M1P4Q9-8124',
    orderNumber: 'VS-M1P4Q9-8124',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'Processing',
    acceptedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        productId: 'prod-009',
        title: 'Handmade Wooden Coaster Set',
        name: 'Handmade Wooden Coaster Set',
        image: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=600',
        category: 'Handicrafts',
        unit: 'set',
        quantity: 25,
        unitPrice: 220,
        originalPrice: 300,
        itemTotal: 5500,
        sellerId: 'biz-sharma-handicrafts',
        sellerName: 'Sharma Handicrafts',
        activeTier: { minQuantity: 20, maxQuantity: 49, pricePerUnit: 220 },
        savings: 2000,
      },
    ],
    totalItems: 1,
    totalUnits: 25,
    subtotal: 5500,
    totalSavings: 2000,
    totalAmount: 5500,
    deliveryAddress: {
      fullName: 'Sunil Banerjee',
      businessName: 'Bengal Craft Emporium',
      phone: '9830112233',
      streetAddress: 'Plot 7, New Market Commercial Lane',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700087',
      gstin: '19AAECB1122D1Z9',
    },
    paymentMethod: 'Cash on Delivery (COD)',
    orderDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  },
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
        name: 'Wireless Bluetooth Earphones',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
        category: 'Electronics',
        unit: 'piece',
        quantity: 25,
        unitPrice: 480,
        originalPrice: 650,
        itemTotal: 12000,
        sellerId: 'biz-002',
        sellerName: 'TechSource Distributors',
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
        name: 'Handwoven Cotton Tote Bag',
        image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600',
        category: 'Clothing',
        unit: 'piece',
        quantity: 50,
        unitPrice: 160,
        originalPrice: 220,
        itemTotal: 8000,
        sellerId: 'biz-001',
        sellerName: 'Shree Handloom Works',
        activeTier: { minQuantity: 50, maxQuantity: 99, pricePerUnit: 160 },
        savings: 3000,
      },
      {
        productId: 'prod-003',
        title: 'Jaipur Blue Pottery Ceramic Vase',
        name: 'Jaipur Blue Pottery Ceramic Vase',
        image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600',
        category: 'Handicrafts',
        unit: 'piece',
        quantity: 15,
        unitPrice: 320,
        originalPrice: 420,
        itemTotal: 4800,
        sellerId: 'biz-003',
        sellerName: 'Rang Artisan Collective',
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

let inMemoryOrders = [...DEFAULT_SEED_ORDERS];
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
 * Returns -1 if cancelled or rejected.
 */
export const getStatusProgress = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'cancelled' || normalized === 'rejected') return -1;
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
    case 'accepted':
      return {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#F59E0B',
        icon: 'cube-outline',
      };
    case 'rejected':
    case 'cancelled':
      return {
        bg: '#FEE2E2',
        text: '#991B1B',
        border: '#EF4444',
        icon: 'close-circle-outline',
      };
    case 'confirmed':
    case 'pending':
    case 'pending acceptance':
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

  if (Array.isArray(orderData.items)) {
    const hasOwn = orderData.items.some((item) =>
      isProductOwnedByCurrentSeller(item)
    );
    if (hasOwn) {
      throw new Error('Sellers cannot purchase products from their own business.');
    }

    const hasUnavailable = orderData.items.some(
      (item) => item.isUnavailable || item.isDeleted || item.status === 'archived'
    );
    if (hasUnavailable) {
      throw new Error('Cannot place order containing unavailable or deleted products.');
    }
  }

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

// ============================================================================
// SELLER ORDER MANAGEMENT HELPERS
// ============================================================================

/**
 * Helper to match seller identity between order item and seller business.
 */
const matchesSeller = (item, sellerId, allProducts = []) => {
  if (!item || !sellerId) return false;
  const cleanSellerId = String(sellerId).trim().toLowerCase();

  // 1. Direct item sellerId / businessId match
  const itemSellerId = String(item.sellerId || '').trim().toLowerCase();
  const itemBizId = String(item.businessId || item.business?.id || '').trim().toLowerCase();
  const itemLegacyId = String(item.legacySellerId || '').trim().toLowerCase();

  if (
    itemSellerId &&
    (itemSellerId === cleanSellerId ||
      (itemSellerId === 'biz-sharma-handicrafts' && cleanSellerId === 'bbb0e0f2-9d38-44af-9c93-edc4004b1637'))
  ) {
    return true;
  }
  if (itemBizId && itemBizId === cleanSellerId) {
    return true;
  }
  if (itemLegacyId && itemLegacyId === cleanSellerId) {
    return true;
  }

  // 2. Lookup by productId in products catalog
  const prodId = item.productId || item.id || item.product?.id;
  if (prodId && Array.isArray(allProducts) && allProducts.length > 0) {
    const cleanProdId = String(prodId).trim().toLowerCase();
    const prod = allProducts.find(
      (p) =>
        String(p.id || '').trim().toLowerCase() === cleanProdId ||
        String(p.legacyId || '').trim().toLowerCase() === cleanProdId
    );
    if (prod) {
      const pSellerId = String(prod.sellerId || '').trim().toLowerCase();
      const pBizId = String(prod.businessId || prod.business?.id || '').trim().toLowerCase();
      if (
        pSellerId &&
        (pSellerId === cleanSellerId ||
          (pSellerId === 'biz-sharma-handicrafts' && cleanSellerId === 'bbb0e0f2-9d38-44af-9c93-edc4004b1637'))
      ) {
        return true;
      }
      if (pBizId && pBizId === cleanSellerId) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Determines whether an order contains at least one product belonging to the specified seller.
 */
export const isOrderForSeller = (order, sellerId, allProducts = []) => {
  if (!order || !sellerId) return false;
  const cleanSellerId = String(sellerId).trim().toLowerCase();

  const oSellerId = String(order.sellerId || '').trim().toLowerCase();
  const oBizId = String(order.businessId || '').trim().toLowerCase();
  if (
    oSellerId &&
    (oSellerId === cleanSellerId ||
      (oSellerId === 'biz-sharma-handicrafts' && cleanSellerId === 'bbb0e0f2-9d38-44af-9c93-edc4004b1637'))
  ) {
    return true;
  }
  if (oBizId && oBizId === cleanSellerId) {
    return true;
  }

  if (Array.isArray(order.items)) {
    return order.items.some((item) =>
      matchesSeller(item, cleanSellerId, allProducts)
    );
  }

  return false;
};

/**
 * Returns only the items in an order that belong to the specified seller.
 */
export const getSellerOrderItems = (order, sellerId, allProducts = []) => {
  if (!order || !Array.isArray(order.items) || !sellerId) return [];
  const cleanSellerId = String(sellerId).trim().toLowerCase();

  return order.items.filter((item) =>
    matchesSeller(item, cleanSellerId, allProducts)
  );
};

/**
 * Returns all orders containing products belonging to the specified seller.
 */
export const getOrdersForSeller = (sellerId, allProducts = []) => {
  if (!sellerId) return [];
  return inMemoryOrders.filter((order) =>
    isOrderForSeller(order, sellerId, allProducts)
  );
};

/**
 * Returns comprehensive seller-filtered details for a specific order.
 */
export const getSellerOrderDetails = (orderId, sellerId, allProducts = []) => {
  const order = getOrderById(orderId);
  if (!order || !sellerId) return null;

  const sellerItems = getSellerOrderItems(order, sellerId, allProducts);
  const sellerSubtotal = sellerItems.reduce((sum, item) => {
    const lineTotal =
      Number(item.itemTotal) ||
      Number(item.unitPrice || item.price || 0) * (Number(item.quantity) || 1);
    return sum + lineTotal;
  }, 0);

  const sellerUnits = sellerItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0
  );

  const sellerSavings = sellerItems.reduce(
    (sum, item) => sum + (Number(item.savings) || 0),
    0
  );

  const totalOrderItemsCount = Array.isArray(order.items)
    ? order.items.length
    : 0;

  return {
    order,
    sellerItems,
    sellerItemCount: sellerItems.length,
    sellerUnits,
    sellerSubtotal,
    sellerSavings,
    sellerTotalAmount: sellerSubtotal,
    hasOtherSellerItems: totalOrderItemsCount > sellerItems.length,
    totalOrderItemsCount,
  };
};

/**
 * Allows a seller to accept an incoming order.
 * Transitions status from 'Confirmed' to 'Processing'.
 */
export const acceptOrder = async (orderId, sellerId, note = '') => {
  const order = getOrderById(orderId);
  if (!order) return { success: false, reason: 'order_not_found' };

  const currentStatus = order.status || 'Confirmed';
  if (!canTransitionStatus(currentStatus, 'Processing')) {
    return {
      success: false,
      reason: 'invalid_status_transition',
      message: `Cannot accept order in status "${currentStatus}".`,
    };
  }

  const updated = await updateOrderStatus(orderId, 'Processing', {
    acceptedAt: new Date().toISOString(),
    sellerAcceptanceNote: note || undefined,
  });

  return { success: true, order: updated };
};

/**
 * Allows a seller to reject an incoming order with a reason.
 * Transitions status to 'Rejected'.
 */
export const rejectOrder = async (orderId, sellerId, reason = '') => {
  const order = getOrderById(orderId);
  if (!order) return { success: false, reason: 'order_not_found' };

  const currentStatus = order.status || 'Confirmed';
  if (!canTransitionStatus(currentStatus, 'Rejected')) {
    return {
      success: false,
      reason: 'invalid_status_transition',
      message: `Cannot reject order in status "${currentStatus}".`,
    };
  }

  const updated = await updateOrderStatus(orderId, 'Rejected', {
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason || 'Seller unable to fulfill consignment at this time',
  });

  return { success: true, order: updated };
};

/**
 * Allows a seller to advance/update order status through valid stages.
 */
export const updateSellerOrderStatus = async (
  orderId,
  newStatus,
  extraData = {}
) => {
  const order = getOrderById(orderId);
  if (!order) return { success: false, reason: 'order_not_found' };

  const currentStatus = order.status || 'Confirmed';
  if (!canTransitionStatus(currentStatus, newStatus)) {
    return {
      success: false,
      reason: 'invalid_status_transition',
      message: `Transition from "${currentStatus}" to "${newStatus}" is not allowed.`,
    };
  }

  const payload = { ...extraData };
  if (newStatus === 'Dispatched' && !order.carrierName) {
    payload.carrierName = extraData.carrierName || 'Delhivery B2B Freight';
    payload.trackingNumber =
      extraData.trackingNumber ||
      `DELHIVERY-B2B-${Math.floor(100000 + Math.random() * 900000)}`;
    payload.dispatchedAt = new Date().toISOString();
  } else if (newStatus === 'Delivered') {
    payload.deliveredAt = new Date().toLocaleDateString('en-IN');
  }

  const updated = await updateOrderStatus(orderId, newStatus, payload);
  return { success: true, order: updated };
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

export const remapOrderSellerId = async (oldSellerId, newSellerId) => {
  if (!oldSellerId || !newSellerId || oldSellerId === newSellerId) return 0;
  const cleanOld = String(oldSellerId).trim().toLowerCase();
  const cleanNew = String(newSellerId).trim();

  let modifiedCount = 0;
  inMemoryOrders.forEach((order) => {
    if (!order) return;
    let orderChanged = false;
    const oSellerId = order.sellerId ? String(order.sellerId).trim().toLowerCase() : '';
    const oBizId = order.businessId ? String(order.businessId).trim().toLowerCase() : '';
    if (oSellerId === cleanOld || oBizId === cleanOld) {
      order.sellerId = cleanNew;
      order.businessId = cleanNew;
      orderChanged = true;
    }
    if (Array.isArray(order.items)) {
      order.items.forEach((item) => {
        if (!item) return;
        const iSellerId = item.sellerId ? String(item.sellerId).trim().toLowerCase() : '';
        if (iSellerId === cleanOld) {
          item.sellerId = cleanNew;
          orderChanged = true;
        }
        if (item.product) {
          const prodSellerId = item.product.sellerId ? String(item.product.sellerId).trim().toLowerCase() : '';
          const prodBizId = item.product.businessId ? String(item.product.businessId).trim().toLowerCase() : '';
          if (prodSellerId === cleanOld || prodBizId === cleanOld) {
            item.product.sellerId = cleanNew;
            item.product.businessId = cleanNew;
            orderChanged = true;
          }
        }
      });
    }
    if (orderChanged) {
      modifiedCount++;
    }
  });

  try {
    if (storage && typeof storage.setItem === 'function') {
      await storage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(inMemoryOrders));
    }
  } catch (err) {
    console.warn('[orders] Failed to remap orders in storage:', err);
  }

  notifyOrderListeners();
  return modifiedCount;
};

export const remapOrderProductId = async (oldProductId, newProductId) => {
  if (!oldProductId || !newProductId || oldProductId === newProductId) return 0;
  const cleanOld = String(oldProductId).trim().toLowerCase();
  const cleanNew = String(newProductId).trim();

  let modifiedCount = 0;
  inMemoryOrders.forEach((order) => {
    if (!order || !Array.isArray(order.items)) return;
    let orderChanged = false;
    order.items.forEach((item) => {
      if (!item) return;
      const pId = item.productId || item.id;
      if (pId && String(pId).trim().toLowerCase() === cleanOld) {
        item.productId = cleanNew;
        if (item.id && String(item.id).trim().toLowerCase() === cleanOld) {
          item.id = cleanNew;
        }
        if (!item.legacyProductId) {
          item.legacyProductId = oldProductId;
        }
        orderChanged = true;
      }
      if (item.product) {
        const itemPId = item.product.id || item.product.productId;
        if (itemPId && String(itemPId).trim().toLowerCase() === cleanOld) {
          item.product.id = cleanNew;
          if (!item.product.legacyId) {
            item.product.legacyId = oldProductId;
          }
          orderChanged = true;
        }
      }
    });
    if (orderChanged) {
      modifiedCount++;
    }
  });

  try {
    if (storage && typeof storage.setItem === 'function') {
      await storage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(inMemoryOrders));
    }
  } catch (err) {
    console.warn('[orders] Failed to remap product ID in orders storage:', err);
  }

  notifyOrderListeners();
  return modifiedCount;
};

export default {
  STORAGE_KEY_ORDERS,
  STORAGE_KEY_ADDRESS,
  ORDER_STAGES,
  VALID_STATUS_TRANSITIONS,
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
  canTransitionStatus,
  isOrderForSeller,
  getSellerOrderItems,
  getOrdersForSeller,
  getSellerOrderDetails,
  acceptOrder,
  rejectOrder,
  updateSellerOrderStatus,
  loadPersistedAddress,
  getSavedAddress,
  saveDeliveryAddress,
  subscribeOrders,
  remapOrderSellerId,
  remapOrderProductId,
};
