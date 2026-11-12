
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSessionBusinessProfile,
  isProductOwnedByCurrentSeller,
} from './businessProfileData.js';
import { getOrders } from './orders.js';
import { getQuotations } from './quotations.js';

export const categories = [
  { id: "all", name: "All Products", icon: "grid-outline" },
  { id: "clothing", name: "Clothing", icon: "shirt-outline" },
  { id: "electronics", name: "Electronics", icon: "phone-portrait-outline" },
  { id: "handicrafts", name: "Handicrafts", icon: "color-palette-outline" },
  { id: "food", name: "Food Products", icon: "nutrition-outline" },
  { id: "home-decor", name: "Home Decor", icon: "home-outline" },
];

export const products = [
  {
    id: "prod-001",
    name: "Handwoven Cotton Tote Bag",
    description:
      "Reusable cotton tote bags handcrafted by local artisans. Suitable for retail stores, events, and corporate gifting.",
    categoryId: "clothing",
    categoryName: "Clothing",
    brand: "Shree Handlooms",
    manufacturer: "Shree Handloom Works",
    price: 180,
    originalPrice: 220,
    unit: "piece",
    moq: 10,
    availableQuantity: 500,
    stock: 500,
    sellerId: "biz-001",
    sellerName: "Shree Handloom Works",
    location: "Jaipur, Rajasthan",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600",
    images: [
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600",
      "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=600",
    ],
    rating: 4.7,
    totalReviews: 42,
    isFeatured: true,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 10, maxQuantity: 49, pricePerUnit: 180 },
      { minQuantity: 50, maxQuantity: 99, pricePerUnit: 160 },
      { minQuantity: 100, maxQuantity: null, pricePerUnit: 140 },
    ],
    tags: ["cotton", "handmade", "reusable", "bags", "tote"],
    specifications: {
      "Material": "100% Khadi Cotton",
      "Color": "Natural Ecru / Off-white",
      "Dimensions": "38 cm x 42 cm",
      "Weight": "180 g",
      "Packaging Type": "Bulk bundle in corrugated master box",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-002",
    name: "Wireless Bluetooth Earphones",
    description:
      "Compact wireless earphones suitable for electronics retailers and bulk resellers.",
    categoryId: "electronics",
    categoryName: "Electronics",
    brand: "TechSource",
    manufacturer: "TechSource Audio Corp",
    price: 650,
    originalPrice: 799,
    unit: "pair",
    moq: 5,
    availableQuantity: 200,
    stock: 200,
    sellerId: "biz-002",
    sellerName: "TechSource Distributors",
    location: "Delhi, India",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
      "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600",
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600",
    ],
    rating: 4.5,
    totalReviews: 31,
    isFeatured: true,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 5, maxQuantity: 19, pricePerUnit: 650 },
      { minQuantity: 20, maxQuantity: 49, pricePerUnit: 600 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 550 },
    ],
    tags: ["electronics", "wireless", "audio", "earphones", "bluetooth", "accessories"],
    specifications: {
      "Model Number": "TS-BT500",
      "Color": "Matte Black",
      "Connectivity": "Bluetooth 5.3",
      "Weight": "42 g",
      "Packaging Type": "Retail display box pack",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-003",
    name: "Handcrafted Blue Pottery Vase",
    description:
      "Decorative pottery made by skilled artisans. Ideal for gift shops, home decor stores, and interior designers.",
    categoryId: "handicrafts",
    categoryName: "Handicrafts",
    brand: "Rang Handicrafts",
    manufacturer: "Rang Artisan Collective",
    price: 450,
    originalPrice: 550,
    unit: "piece",
    moq: 5,
    availableQuantity: 120,
    stock: 120,
    sellerId: "biz-003",
    sellerName: "Rang Artisan Collective",
    location: "Jaipur, Rajasthan",
    image:
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
    images: [
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
      "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=600",
    ],
    rating: 4.8,
    totalReviews: 56,
    isFeatured: true,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 5, maxQuantity: 19, pricePerUnit: 450 },
      { minQuantity: 20, maxQuantity: 49, pricePerUnit: 410 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 370 },
    ],
    tags: ["pottery", "handmade", "decor", "handicrafts", "vase", "ceramic"],
    specifications: {
      "Material": "Quartz stone powder & natural resin",
      "Color": "Cobalt Blue & Turquoise",
      "Dimensions": "25 cm (H) x 12 cm (Dia)",
      "Weight": "850 g",
      "Packaging Type": "Corrugated carton with bubble cushion",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-004",
    name: "Organic Turmeric Powder",
    description:
      "Aromatic turmeric powder packed for grocery retailers and food distributors. Check the seller's packaging and food-safety details before ordering.",
    categoryId: "food",
    categoryName: "Food Products",
    brand: "PureHarvest Organic",
    manufacturer: "PureHarvest Foods",
    price: 140,
    originalPrice: 170,
    unit: "kg",
    moq: 10,
    availableQuantity: 300,
    stock: 300,
    sellerId: "biz-004",
    sellerName: "PureHarvest Foods",
    location: "Sangli, Maharashtra",
    image:
      "https://images.unsplash.com/photo-1615485500704-8e990f9900f2?w=600",
    rating: 4.6,
    totalReviews: 27,
    isFeatured: true,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 10, maxQuantity: 24, pricePerUnit: 140 },
      { minQuantity: 25, maxQuantity: 49, pricePerUnit: 125 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 110 },
    ],
    tags: ["organic", "spices", "food", "turmeric", "grocery"],
    specifications: {
      "Grade": "Agmark Grade-A (5% Curcumin)",
      "Form": "Fine Ground Powder",
      "Shelf Life": "12 Months",
      "Packaging Type": "Airtight vacuum food-grade HDPE pouch",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-005",
    name: "Decorative Ceramic Planters",
    description:
      "Minimal ceramic planters for nurseries, home decor shops, and lifestyle retailers.",
    categoryId: "home-decor",
    categoryName: "Home Decor",
    price: 250,
    originalPrice: 320,
    unit: "piece",
    moq: 8,
    availableQuantity: 12,
    stock: 12,
    sellerId: "biz-005",
    sellerName: "EarthNest Ceramics",
    location: "Pune, Maharashtra",
    image:
      "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600",
    rating: 4.4,
    totalReviews: 19,
    isFeatured: true,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 8, maxQuantity: 19, pricePerUnit: 250 },
      { minQuantity: 20, maxQuantity: 49, pricePerUnit: 220 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 195 },
    ],
    tags: ["planters", "ceramic", "home", "pots", "decor"],
    specifications: {
      "Material": "Glazed Terracotta Ceramic",
      "Color": "Pastel Sage & Ivory",
      "Dimensions": "15 cm x 15 cm x 14 cm",
      "Weight": "620 g",
      "Packaging Type": "Set of 2 in partitioned box",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-006",
    name: "Cotton Kurta Fabric",
    description:
      "Soft cotton fabric suitable for boutique owners, garment makers, and textile retailers.",
    categoryId: "clothing",
    categoryName: "Clothing",
    price: 160,
    originalPrice: 200,
    unit: "meter",
    moq: 20,
    availableQuantity: 1000,
    stock: 1000,
    sellerId: "biz-006",
    sellerName: "Maharashtra Textile House",
    location: "Ichalkaranji, Maharashtra",
    image:
      "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=600",
    rating: 4.3,
    totalReviews: 24,
    isFeatured: false,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 20, maxQuantity: 99, pricePerUnit: 160 },
      { minQuantity: 100, maxQuantity: 299, pricePerUnit: 145 },
      { minQuantity: 300, maxQuantity: null, pricePerUnit: 130 },
    ],
    tags: ["cotton", "fabric", "textile", "kurta", "kurti", "apparel"],
    specifications: {
      "Material": "60s Count Combed Cotton",
      "Color": "Indigo Block Print",
      "Dimensions": "Width: 44 inches (112 cm)",
      "Weight": "110 GSM",
      "Packaging Type": "Folded bolt roll in poly wrap",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-007",
    name: "Jute Gift Bags - Clearance",
    description:
      "Surplus jute gift bags offered at a discounted price to clear excess inventory.",
    categoryId: "handicrafts",
    categoryName: "Handicrafts",
    price: 55,
    originalPrice: 85,
    unit: "piece",
    moq: 25,
    availableQuantity: 0,
    stock: 0,
    sellerId: "biz-007",
    sellerName: "EcoCraft Industries",
    location: "Nashik, Maharashtra",
    image:
      "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600",
    rating: 4.2,
    totalReviews: 15,
    isFeatured: false,
    isSurplus: true,
    surplusDeadline: "2026-11-30",
    tags: ["jute", "eco-friendly", "clearance", "bags", "handicrafts"],
    specifications: {
      "Material": "Laminated Golden Jute",
      "Color": "Natural Golden Brown",
      "Dimensions": "20 cm x 25 cm x 10 cm",
      "Packaging Type": "Bundles of 25 pcs in export carton",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-008",
    name: "LED Desk Lamp",
    description:
      "Energy-efficient desk lamp for office supply stores and electronics resellers.",
    categoryId: "electronics",
    categoryName: "Electronics",
    price: 380,
    originalPrice: 450,
    unit: "piece",
    moq: 5,
    availableQuantity: 18,
    stock: 18,
    sellerId: "biz-002",
    sellerName: "TechSource Distributors",
    location: "Delhi, India",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600",
    rating: 4.5,
    totalReviews: 22,
    isFeatured: false,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 5, maxQuantity: 19, pricePerUnit: 380 },
      { minQuantity: 20, maxQuantity: 49, pricePerUnit: 345 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 310 },
    ],
    tags: ["LED", "lighting", "office", "lamp", "electronics"],
    specifications: {
      "Model Number": "DL-12W-ECO",
      "Color": "Arctic White",
      "Dimensions": "16 cm x 16 cm x 38 cm",
      "Weight": "480 g",
      "Packaging Type": "Color gift box with foam inset",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-009",
    name: "Roasted Peanut Snack Packs",
    description:
      "Individually packed roasted peanuts for convenience stores and wholesale distributors.",
    categoryId: "food",
    categoryName: "Food Products",
    price: 25,
    originalPrice: 35,
    unit: "pack",
    moq: 50,
    availableQuantity: 2000,
    stock: 2000,
    sellerId: "biz-004",
    sellerName: "PureHarvest Foods",
    location: "Sangli, Maharashtra",
    image:
      "https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=600",
    rating: 4.4,
    totalReviews: 18,
    isFeatured: false,
    isSurplus: true,
    surplusDeadline: "2026-11-15",
    bulkPricing: [
      { minQuantity: 50, maxQuantity: 99, pricePerUnit: 25 },
      { minQuantity: 100, maxQuantity: 499, pricePerUnit: 22 },
      { minQuantity: 500, maxQuantity: null, pricePerUnit: 19 },
    ],
    tags: ["snacks", "food", "wholesale"],
    specifications: {
      "Flavor": "Hing Jeera Spiced",
      "Weight": "50 g per pack",
      "Packaging Type": "Nitrogen-flushed metallized pouch",
      "Shelf Life": "6 Months",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-010",
    name: "Hand-painted Wooden Coasters",
    description:
      "Artisan-made wooden coasters for gift stores, cafes, and home decor retailers.",
    categoryId: "home-decor",
    categoryName: "Home Decor",
    price: 120,
    originalPrice: 150,
    unit: "set",
    moq: 10,
    availableQuantity: 300,
    stock: 300,
    sellerId: "biz-003",
    sellerName: "Rang Artisan Collective",
    location: "Jaipur, Rajasthan",
    image:
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600",
    rating: 4.7,
    totalReviews: 33,
    isFeatured: false,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 10, maxQuantity: 24, pricePerUnit: 120 },
      { minQuantity: 25, maxQuantity: 49, pricePerUnit: 105 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 90 },
    ],
    tags: ["wood", "handmade", "gifts"],
    specifications: {
      "Material": "Seasoned Mango Wood",
      "Color": "Multi-color hand-lacquered",
      "Dimensions": "10 cm x 10 cm x 0.8 cm",
      "Weight": "280 g (set of 6)",
      "Packaging Type": "Kraft gift box with wooden holder",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-011",
    name: "Handcrafted Wooden Wall Hanging",
    description:
      "Intricately hand-carved floral wall panel crafted from seasoned Sheesham wood. Perfect for gift boutiques, interior decorators, and home decor retailers.",
    categoryId: "home-decor",
    categoryName: "Home Decor",
    brand: "Sharma Handicrafts",
    manufacturer: "Sharma Handicrafts",
    price: 320,
    originalPrice: 400,
    unit: "piece",
    moq: 5,
    availableQuantity: 85,
    stock: 85,
    sellerId: "biz-sharma-handicrafts",
    sellerName: "Sharma Handicrafts",
    location: "Bhopal, Madhya Pradesh",
    image:
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
    images: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
      "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=600",
    ],
    rating: 4.8,
    totalReviews: 28,
    isFeatured: true,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 5, maxQuantity: 19, pricePerUnit: 320 },
      { minQuantity: 20, maxQuantity: 49, pricePerUnit: 290 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 260 },
    ],
    tags: ["wooden", "handmade", "wall-hanging", "decor", "handicrafts", "traditional"],
    specifications: {
      "Material": "Seasoned Sheesham Wood",
      "Finish": "Antique Walnut Polish",
      "Dimensions": "30 cm x 30 cm x 2.5 cm",
      "Weight": "650 g",
      "Packaging Type": "Shrink wrap with bubble cushion in master carton",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-012",
    name: "Brass Engraved Decorative Diya Set",
    description:
      "Traditional handcrafted brass oil lamps with fine artisan engravings. Popular for festive gift collections, return gifts, and boutique handicraft shops.",
    categoryId: "handicrafts",
    categoryName: "Handicrafts",
    brand: "Sharma Handicrafts",
    manufacturer: "Sharma Handicrafts",
    price: 240,
    originalPrice: 300,
    unit: "set",
    moq: 10,
    availableQuantity: 150,
    stock: 150,
    sellerId: "biz-sharma-handicrafts",
    sellerName: "Sharma Handicrafts",
    location: "Bhopal, Madhya Pradesh",
    image:
      "https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=600",
    images: [
      "https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=600",
    ],
    rating: 4.6,
    totalReviews: 19,
    isFeatured: false,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 10, maxQuantity: 29, pricePerUnit: 240 },
      { minQuantity: 30, maxQuantity: 74, pricePerUnit: 215 },
      { minQuantity: 75, maxQuantity: null, pricePerUnit: 190 },
    ],
    tags: ["brass", "diya", "traditional", "handicrafts", "decor", "pooja"],
    specifications: {
      "Material": "Pure Brass",
      "Finish": "Polished Golden Brass",
      "Dimensions": "8 cm (Dia) x 4 cm (H) per piece",
      "Weight": "350 g (set of 2)",
      "Packaging Type": "Velvet-lined gift presentation box",
      "Country of Origin": "India",
    },
  },
  {
    id: "prod-013",
    name: "Handmade Mango Wood Jewelry Box",
    description:
      "Artisan-crafted wooden keepsake box with red velvet lining and intricate brass inlay work. Ideal for jewelry retailers, gift stores, and handicraft emporiums.",
    categoryId: "home-decor",
    categoryName: "Home Decor",
    brand: "Sharma Handicrafts",
    manufacturer: "Sharma Handicrafts",
    price: 350,
    originalPrice: 450,
    unit: "piece",
    moq: 8,
    availableQuantity: 95,
    stock: 95,
    sellerId: "biz-sharma-handicrafts",
    sellerName: "Sharma Handicrafts",
    location: "Bhopal, Madhya Pradesh",
    image:
      "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=600",
    images: [
      "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=600",
    ],
    rating: 4.7,
    totalReviews: 24,
    isFeatured: false,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 8, maxQuantity: 24, pricePerUnit: 350 },
      { minQuantity: 25, maxQuantity: 49, pricePerUnit: 310 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 280 },
    ],
    tags: ["wooden", "box", "jewelry", "handicrafts", "brass-inlay", "decor"],
    specifications: {
      "Material": "Seasoned Mango Wood & Brass Inlay",
      "Interior": "Red Velvet Lining",
      "Dimensions": "18 cm x 12 cm x 7 cm",
      "Weight": "420 g",
      "Packaging Type": "Protective foam pack in brown craft carton",
      "Country of Origin": "India",
    },
  },
];

export const isProductActive = (product) => {
  if (!product || typeof product !== 'object') return false;
  if (product.isDeleted === true) return false;
  if (product.isArchived === true) return false;
  if (product.status === 'archived' || product.status === 'deleted') return false;
  if (product.isActive === false) return false;
  return true;
};

export const getFeaturedProducts = () =>
  products.filter((product) => isProductActive(product) && Boolean(product?.isFeatured));

export const getSurplusProducts = () =>
  products.filter((product) => isProductActive(product) && Boolean(product?.isSurplus));

export const getProductsByCategory = (categoryId) =>
  !categoryId || categoryId === 'all'
    ? products.filter(isProductActive)
    : products.filter(
        (product) =>
          isProductActive(product) &&
          (product.categoryId === categoryId || product.category === categoryId)
      );

export const searchProducts = (query) => {
  if (!query || typeof query !== 'string') return products.filter(isProductActive);
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return products.filter(isProductActive);

  return products.filter((product) => {
    if (!product || !isProductActive(product)) return false;
    const searchableText = [
      product.name,
      product.categoryName,
      product.category,
      product.brand,
      product.manufacturer,
      product.sellerName,
      product.location,
      ...(Array.isArray(product.tags) ? product.tags : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return tokens.every((token) => searchableText.includes(token));
  });
};

export const STORAGE_KEY_CUSTOM_PRODUCTS = '@vyaparsetu_custom_products';
export const STORAGE_KEY_DELETED_PRODUCT_IDS = '@vyaparsetu_deleted_product_ids';
export const STORAGE_KEY_ARCHIVED_PRODUCT_IDS = '@vyaparsetu_archived_product_ids';

const storage =
  AsyncStorage && typeof AsyncStorage.setItem === 'function'
    ? AsyncStorage
    : (AsyncStorage && AsyncStorage.default) || AsyncStorage;

const productListeners = new Set();
let cachedDeletedIds = new Set();
let cachedArchivedIds = new Set();

export const isProductDeletedLocally = (id) => {
  if (!id) return false;
  return cachedDeletedIds.has(String(id).trim().toLowerCase());
};

export const isProductArchivedLocally = (id) => {
  if (!id) return false;
  return cachedArchivedIds.has(String(id).trim().toLowerCase());
};

export const sanitizeApiProduct = (product) => {
  if (!product || !product.id) return null;
  const cleanId = String(product.id).trim().toLowerCase();
  if (cachedDeletedIds.has(cleanId)) return null;
  if (cachedArchivedIds.has(cleanId)) {
    return {
      ...product,
      isDeleted: true,
      isArchived: true,
      status: 'archived',
      isActive: false,
    };
  }
  return product;
};

export const filterActiveProducts = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map(sanitizeApiProduct)
    .filter((p) => p && isProductActive(p));
};

export const subscribeProducts = (listener) => {
  if (typeof listener !== 'function') return () => {};
  productListeners.add(listener);
  return () => {
    productListeners.delete(listener);
  };
};

const notifyProductListeners = () => {
  productListeners.forEach((listener) => {
    try {
      listener(products);
    } catch (e) {
      console.warn('[products] Listener error:', e);
    }
  });
};

const persistCustomProducts = async () => {
  try {
    const customProducts = products.filter(
      (p) =>
        p &&
        (p.isCustom ||
          (p.id && String(p.id).startsWith('prod-custom-')) ||
          (p.id && String(p.id).startsWith('prod-submitted-')) ||
          (p.id && !p.id.startsWith('prod-00')))
    );
    if (storage && typeof storage.setItem === 'function') {
      await storage.setItem(
        STORAGE_KEY_CUSTOM_PRODUCTS,
        JSON.stringify(customProducts)
      );
    }
  } catch (error) {
    console.warn('[products] Failed to persist custom products:', error);
  }
};

const persistDeletedProductId = async (id) => {
  try {
    if (!storage || typeof storage.getItem !== 'function') return;
    const cleanId = String(id).trim().toLowerCase();
    const json = await storage.getItem(STORAGE_KEY_DELETED_PRODUCT_IDS);
    const existing = json ? JSON.parse(json) : [];
    if (!existing.includes(cleanId)) {
      existing.push(cleanId);
      await storage.setItem(
        STORAGE_KEY_DELETED_PRODUCT_IDS,
        JSON.stringify(existing)
      );
    }
  } catch (e) {
    console.warn('[products] Error persisting deleted product ID:', e);
  }
};

const persistArchivedProductId = async (id) => {
  try {
    if (!storage || typeof storage.getItem !== 'function') return;
    const cleanId = String(id).trim().toLowerCase();
    const json = await storage.getItem(STORAGE_KEY_ARCHIVED_PRODUCT_IDS);
    const existing = json ? JSON.parse(json) : [];
    if (!existing.includes(cleanId)) {
      existing.push(cleanId);
      await storage.setItem(
        STORAGE_KEY_ARCHIVED_PRODUCT_IDS,
        JSON.stringify(existing)
      );
    }
  } catch (e) {
    console.warn('[products] Error persisting archived product ID:', e);
  }
};

/**
 * Checks whether the deleted or archived product is in buyer cart and flags it as unavailable.
 */
const updateCartOnProductDeleted = async (productId) => {
  try {
    if (!storage || typeof storage.getItem !== 'function') return;
    const cleanId = String(productId).trim().toLowerCase();
    const cartJson = await storage.getItem('@vyaparsetu_cart');
    if (cartJson) {
      const cartItems = JSON.parse(cartJson);
      if (Array.isArray(cartItems)) {
        let changed = false;
        const updated = cartItems.map((item) => {
          const pId = item?.id || item?.productId || item?.product?.id;
          if (pId && String(pId).trim().toLowerCase() === cleanId) {
            changed = true;
            return {
              ...item,
              isUnavailable: true,
              unavailableReason:
                'This product has been removed by the seller and is no longer available.',
            };
          }
          return item;
        });
        if (changed) {
          await storage.setItem('@vyaparsetu_cart', JSON.stringify(updated));
        }
      }
    }
  } catch (e) {
    console.warn('[products] Error updating cart storage on product deletion:', e);
  }
};

/**
 * Checks whether a product has historical orders or quotation requests.
 */
export const hasProductOrdersOrQuotations = (productId) => {
  if (!productId) return false;
  const cleanId = String(productId).trim().toLowerCase();

  // Check orders
  try {
    const allOrders = getOrders();
    if (Array.isArray(allOrders)) {
      const hasOrder = allOrders.some((order) => {
        if (!order || !Array.isArray(order.items)) return false;
        return order.items.some((item) => {
          const pId = item?.productId || item?.id;
          return pId && String(pId).trim().toLowerCase() === cleanId;
        });
      });
      if (hasOrder) return true;
    }
  } catch (e) {
    console.warn('[products] Error checking orders for product:', e);
  }

  // Check quotations
  try {
    const allQuotes = getQuotations();
    if (Array.isArray(allQuotes)) {
      const hasQuote = allQuotes.some((quote) => {
        if (!quote) return false;
        const pId = quote.productId || quote.product?.id;
        return pId && String(pId).trim().toLowerCase() === cleanId;
      });
      if (hasQuote) return true;
    }
  } catch (e) {
    console.warn('[products] Error checking quotations for product:', e);
  }

  return false;
};

/**
 * Delete or archive product based on historical records:
 * - If product has NO orders or quotations: permanently removed from catalog and storage.
 * - If product has existing orders or quotations: soft-deleted / archived to preserve historical snapshots.
 *
 * Verifies ownership using sellerId and session business profile.
 */
export const deleteProduct = async (productId, customProfile) => {
  if (!productId) {
    return {
      success: false,
      reason: 'invalid_id',
      message: 'Product ID is required.',
    };
  }

  const cleanId = String(productId).trim().toLowerCase();
  const index = products.findIndex(
    (p) => p && String(p.id).trim().toLowerCase() === cleanId
  );

  if (index === -1) {
    return {
      success: false,
      reason: 'not_found',
      message: 'Product not found in catalog.',
    };
  }

  const product = products[index];

  // Ownership verification using existing sellerId / session business profile logic
  const profile =
    customProfile !== undefined ? customProfile : getSessionBusinessProfile();
  if (!isProductOwnedByCurrentSeller(product, profile)) {
    return {
      success: false,
      reason: 'unauthorized',
      message: 'You can only delete products belonging to your own business.',
    };
  }

  const hasHistory = hasProductOrdersOrQuotations(product.id);

  if (hasHistory) {
    // Soft-delete / Archive to preserve order & quotation records
    const archivedProduct = {
      ...product,
      isDeleted: true,
      isArchived: true,
      status: 'archived',
      isActive: false,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products[index] = archivedProduct;

    cachedArchivedIds.add(String(product.id).trim().toLowerCase());
    await persistArchivedProductId(product.id);
    await persistCustomProducts();
    await updateCartOnProductDeleted(product.id);

    notifyProductListeners();
    return {
      success: true,
      mode: 'archived',
      message: 'Product archived successfully. Historical records preserved.',
      product: archivedProduct,
    };
  } else {
    // Hard-delete: permanently remove product from catalog
    products.splice(index, 1);

    cachedDeletedIds.add(String(product.id).trim().toLowerCase());
    await persistDeletedProductId(product.id);
    await persistCustomProducts();
    await updateCartOnProductDeleted(product.id);

    notifyProductListeners();
    return {
      success: true,
      mode: 'deleted',
      message: 'Product permanently deleted.',
      productId: product.id,
    };
  }
};

export const loadPersistedProducts = async () => {
  try {
    if (storage && typeof storage.getItem === 'function') {
      const [customJson, deletedJson, archivedJson] = await Promise.all([
        storage.getItem(STORAGE_KEY_CUSTOM_PRODUCTS),
        storage.getItem(STORAGE_KEY_DELETED_PRODUCT_IDS),
        storage.getItem(STORAGE_KEY_ARCHIVED_PRODUCT_IDS),
      ]);

      const deletedIds = new Set(
        deletedJson
          ? JSON.parse(deletedJson).map((id) => String(id).trim().toLowerCase())
          : []
      );
      const archivedIds = new Set(
        archivedJson
          ? JSON.parse(archivedJson).map((id) => String(id).trim().toLowerCase())
          : []
      );

      cachedDeletedIds = deletedIds;
      cachedArchivedIds = archivedIds;

      // 1. Remove any permanently deleted products
      for (let i = products.length - 1; i >= 0; i--) {
        const p = products[i];
        if (p && p.id && deletedIds.has(String(p.id).trim().toLowerCase())) {
          products.splice(i, 1);
        }
      }

      // 2. Load custom products
      if (customJson) {
        const customProducts = JSON.parse(customJson);
        if (Array.isArray(customProducts)) {
          customProducts.forEach((cp) => {
            if (!cp || !cp.id) return;
            const cleanId = String(cp.id).trim().toLowerCase();
            if (deletedIds.has(cleanId)) return; // Exclude permanently deleted

            const index = products.findIndex(
              (p) => p && String(p.id).trim().toLowerCase() === cleanId
            );
            if (index !== -1) {
              products[index] = { ...products[index], ...cp };
            } else {
              products.unshift(cp);
            }
          });
        }
      }

      // 3. Mark any archived products (for both seed and custom products)
      products.forEach((p, idx) => {
        if (p && p.id && archivedIds.has(String(p.id).trim().toLowerCase())) {
          products[idx] = {
            ...p,
            isDeleted: true,
            isArchived: true,
            status: 'archived',
            isActive: false,
          };
        }
      });
    }
  } catch (error) {
    console.warn('[products] Failed to load persisted products:', error);
  }
  notifyProductListeners();
  return products;
};

export const addProduct = (productData) => {
  if (!productData) return null;
  const newProduct = {
    ...productData,
    id: productData.id || `prod-custom-${Date.now()}`,
    isCustom: true,
    createdAt: productData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Prepend to products array so it appears at top of lists
  products.unshift(newProduct);
  notifyProductListeners();
  persistCustomProducts();
  return newProduct;
};

export const updateProduct = (updatedProduct) => {
  if (!updatedProduct || !updatedProduct.id) return null;
  const cleanId = String(updatedProduct.id).trim().toLowerCase();
  const index = products.findIndex(
    (p) => p && String(p.id).trim().toLowerCase() === cleanId
  );

  const productPayload = {
    ...updatedProduct,
    updatedAt: new Date().toISOString(),
  };

  if (index !== -1) {
    products[index] = { ...products[index], ...productPayload };
  } else {
    products.unshift(productPayload);
  }

  notifyProductListeners();
  persistCustomProducts();
  return productPayload;
};

export const saveProduct = (productData) => {
  if (!productData) return null;
  if (productData.id) {
    const existing = products.find(
      (p) =>
        p &&
        String(p.id).trim().toLowerCase() ===
          String(productData.id).trim().toLowerCase()
    );
    if (existing) {
      return updateProduct(productData);
    }
  }
  return addProduct(productData);
};

export const getProductById = (id) => {
  if (!id) return null;
  const cleanId = String(id).trim().toLowerCase();
  return (
    products.find(
      (p) => p && String(p.id).trim().toLowerCase() === cleanId
    ) || null
  );
};
