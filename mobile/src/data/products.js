
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
    price: 180,
    originalPrice: 220,
    unit: "piece",
    moq: 10,
    availableQuantity: 500,
    sellerId: "biz-001",
    sellerName: "Shree Handloom Works",
    location: "Jaipur, Rajasthan",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600",
    rating: 4.7,
    totalReviews: 42,
    isFeatured: true,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 10, maxQuantity: 49, pricePerUnit: 180 },
      { minQuantity: 50, maxQuantity: 99, pricePerUnit: 160 },
      { minQuantity: 100, maxQuantity: null, pricePerUnit: 140 },
    ],
    tags: ["cotton", "handmade", "reusable"],
  },
  {
    id: "prod-002",
    name: "Wireless Bluetooth Earphones",
    description:
      "Compact wireless earphones suitable for electronics retailers and bulk resellers.",
    categoryId: "electronics",
    categoryName: "Electronics",
    price: 650,
    originalPrice: 799,
    unit: "pair",
    moq: 5,
    availableQuantity: 200,
    sellerId: "biz-002",
    sellerName: "TechSource Distributors",
    location: "Delhi, India",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    rating: 4.5,
    totalReviews: 31,
    isFeatured: true,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 5, maxQuantity: 19, pricePerUnit: 650 },
      { minQuantity: 20, maxQuantity: 49, pricePerUnit: 600 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 550 },
    ],
    tags: ["electronics", "wireless", "audio"],
  },
  {
    id: "prod-003",
    name: "Handcrafted Blue Pottery Vase",
    description:
      "Decorative pottery made by skilled artisans. Ideal for gift shops, home decor stores, and interior designers.",
    categoryId: "handicrafts",
    categoryName: "Handicrafts",
    price: 450,
    originalPrice: 550,
    unit: "piece",
    moq: 5,
    availableQuantity: 120,
    sellerId: "biz-003",
    sellerName: "Rang Artisan Collective",
    location: "Jaipur, Rajasthan",
    image:
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
    rating: 4.8,
    totalReviews: 56,
    isFeatured: true,
    isSurplus: false,
    bulkPricing: [
      { minQuantity: 5, maxQuantity: 19, pricePerUnit: 450 },
      { minQuantity: 20, maxQuantity: 49, pricePerUnit: 410 },
      { minQuantity: 50, maxQuantity: null, pricePerUnit: 370 },
    ],
    tags: ["pottery", "handmade", "decor"],
  },
  {
    id: "prod-004",
    name: "Organic Turmeric Powder",
    description:
      "Aromatic turmeric powder packed for grocery retailers and food distributors. Check the seller's packaging and food-safety details before ordering.",
    categoryId: "food",
    categoryName: "Food Products",
    price: 140,
    originalPrice: 170,
    unit: "kg",
    moq: 10,
    availableQuantity: 300,
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
    tags: ["organic", "spices", "food"],
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
    availableQuantity: 180,
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
    tags: ["planters", "ceramic", "home"],
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
    tags: ["cotton", "fabric", "textile"],
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
    availableQuantity: 150,
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
    bulkPricing: [
      { minQuantity: 25, maxQuantity: 49, pricePerUnit: 55 },
      { minQuantity: 50, maxQuantity: 99, pricePerUnit: 45 },
      { minQuantity: 100, maxQuantity: null, pricePerUnit: 38 },
    ],
    tags: ["jute", "eco-friendly", "clearance"],
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
    availableQuantity: 250,
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
    tags: ["LED", "lighting", "office"],
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
  },
];

export const getFeaturedProducts = () =>
  products.filter((product) => product.isFeatured);

export const getSurplusProducts = () =>
  products.filter((product) => product.isSurplus);

export const getProductsByCategory = (categoryId) =>
  categoryId === "all"
    ? products
    : products.filter((product) => product.categoryId === categoryId);

export const searchProducts = (query) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return products;

  return products.filter((product) =>
    [
      product.name,
      product.categoryName,
      product.sellerName,
      product.location,
      ...product.tags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
};
