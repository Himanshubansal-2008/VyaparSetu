require("dotenv/config");
const prisma = require("../src/lib/prisma");

const SELLER_USERS = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    name: "Shree Handloom Works Seller",
    email: "seller1@vyaparsetu.test",
    role: "SELLER",
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    name: "TechSource Distributors Seller",
    email: "seller2@vyaparsetu.test",
    role: "SELLER",
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    name: "Rang Artisan Collective Seller",
    email: "seller3@vyaparsetu.test",
    role: "SELLER",
  },
  {
    id: "a1000000-0000-4000-8000-000000000004",
    name: "PureHarvest Foods Seller",
    email: "seller4@vyaparsetu.test",
    role: "SELLER",
  },
  {
    id: "a1000000-0000-4000-8000-000000000005",
    name: "EarthNest Ceramics Seller",
    email: "seller5@vyaparsetu.test",
    role: "SELLER",
  },
  {
    id: "a1000000-0000-4000-8000-000000000006",
    name: "Maharashtra Textile House Seller",
    email: "seller6@vyaparsetu.test",
    role: "SELLER",
  },
  {
    id: "a1000000-0000-4000-8000-000000000007",
    name: "EcoCraft Industries Seller",
    email: "seller7@vyaparsetu.test",
    role: "SELLER",
  },
];

const SELLER_BUSINESSES = [
  {
    id: "b1000000-0000-4000-8000-000000000001",
    ownerId: "a1000000-0000-4000-8000-000000000001",
    name: "Shree Handloom Works",
    description: "Traditional handwoven textiles, cotton tote bags, and artisanal fabrics from Varanasi.",
    category: "Clothing & Textiles",
    city: "Varanasi",
    state: "Uttar Pradesh",
    pincode: "221001",
    phone: "+91-9876543201",
    email: "contact@shreehandloom.com",
  },
  {
    id: "b1000000-0000-4000-8000-000000000002",
    ownerId: "a1000000-0000-4000-8000-000000000002",
    name: "TechSource Distributors",
    description: "Wholesale distributor of mobile accessories, audio electronics, and LED solutions.",
    category: "Electronics",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560002",
    phone: "+91-9876543202",
    email: "sales@techsource.in",
  },
  {
    id: "b1000000-0000-4000-8000-000000000003",
    ownerId: "a1000000-0000-4000-8000-000000000003",
    name: "Rang Artisan Collective",
    description: "Artisanal collective crafting authentic blue pottery, handmade wooden coasters, and handcrafted home accessories.",
    category: "Home & Kitchen",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    phone: "+91-9876543203",
    email: "info@rangartisans.com",
  },
  {
    id: "b1000000-0000-4000-8000-000000000004",
    ownerId: "a1000000-0000-4000-8000-000000000004",
    name: "PureHarvest Foods",
    description: "FSSAI-certified wholesale spices, turmeric powder, and roasted agricultural snack packs.",
    category: "Food & Beverages",
    city: "Nashik",
    state: "Maharashtra",
    pincode: "422010",
    phone: "+91-9876543204",
    email: "orders@pureharvest.in",
  },
  {
    id: "b1000000-0000-4000-8000-000000000005",
    ownerId: "a1000000-0000-4000-8000-000000000005",
    name: "EarthNest Ceramics",
    description: "Glazed ceramic planters, pottery ware, and nursery pots from Khurja pottery hub.",
    category: "Home & Kitchen",
    city: "Khurja",
    state: "Uttar Pradesh",
    pincode: "203131",
    phone: "+91-9876543205",
    email: "connect@earthnest.com",
  },
  {
    id: "b1000000-0000-4000-8000-000000000006",
    ownerId: "a1000000-0000-4000-8000-000000000006",
    name: "Maharashtra Textile House",
    description: "Wholesale mill-finish and handloom cotton kurta fabrics and garment materials.",
    category: "Clothing & Textiles",
    city: "Ichalkaranji",
    state: "Maharashtra",
    pincode: "416115",
    phone: "+91-9876543206",
    email: "sales@maharashtratextile.com",
  },
  {
    id: "b1000000-0000-4000-8000-000000000007",
    ownerId: "a1000000-0000-4000-8000-000000000007",
    name: "EcoCraft Industries",
    description: "Eco-friendly jute gift bags, promotional packaging, and biodegradable tote bags.",
    category: "Home & Kitchen",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700001",
    phone: "+91-9876543207",
    email: "export@ecocraft.in",
  },
];

const MARKETPLACE_PRODUCTS = [
  {
    id: "c1000000-0000-4000-8000-000000000001",
    name: "Handwoven Cotton Tote Bag",
    description: "Eco-friendly 100% natural cotton canvas tote bag. Features reinforced cross-stitch handles and wide gusset. Ideal for retail stores, boutique giveaways, and eco-conscious branding.",
    price: 180.00,
    stock: 500,
    minOrderQuantity: 10,
    unit: "piece",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600",
    isActive: true,
    isFeatured: true,
    categoryId: "e3e5b3c7-b7d0-423d-b876-f9bc53cdcbaa", // Clothing & Textiles
    businessId: "b1000000-0000-4000-8000-000000000001",
    bulkPricing: [
      { id: "d1000000-0000-4000-8000-000000000001", minQuantity: 10, maxQuantity: 49, pricePerUnit: 180.00 },
      { id: "d1000000-0000-4000-8000-000000000002", minQuantity: 50, maxQuantity: 99, pricePerUnit: 160.00 },
      { id: "d1000000-0000-4000-8000-000000000003", minQuantity: 100, maxQuantity: null, pricePerUnit: 140.00 },
    ],
  },
  {
    id: "c1000000-0000-4000-8000-000000000002",
    name: "Wireless Bluetooth Earphones",
    description: "TWS earbuds with Bluetooth 5.3, active noise cancellation, and up to 30 hours of playback with charging case.",
    price: 650.00,
    stock: 200,
    minOrderQuantity: 5,
    unit: "piece",
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600",
    isActive: true,
    isFeatured: true,
    categoryId: "815ef527-5348-4c5f-9b1e-5d1695eb6535", // Electronics
    businessId: "b1000000-0000-4000-8000-000000000002",
    bulkPricing: [
      { id: "d1000000-0000-4000-8000-000000000004", minQuantity: 5, maxQuantity: 19, pricePerUnit: 650.00 },
      { id: "d1000000-0000-4000-8000-000000000005", minQuantity: 20, maxQuantity: 49, pricePerUnit: 600.00 },
      { id: "d1000000-0000-4000-8000-000000000006", minQuantity: 50, maxQuantity: null, pricePerUnit: 550.00 },
    ],
  },
  {
    id: "c1000000-0000-4000-8000-000000000003",
    name: "Handcrafted Blue Pottery Vase",
    description: "Decorative pottery made by skilled artisans in Jaipur. Ideal for gift shops, home decor stores, and interior designers.",
    price: 450.00,
    stock: 120,
    minOrderQuantity: 5,
    unit: "piece",
    imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
    isActive: true,
    isFeatured: true,
    categoryId: "53a2d5f1-baaa-4928-ab5c-75639a452c50", // Home & Kitchen
    businessId: "b1000000-0000-4000-8000-000000000003",
    bulkPricing: [
      { id: "d1000000-0000-4000-8000-000000000007", minQuantity: 5, maxQuantity: 19, pricePerUnit: 450.00 },
      { id: "d1000000-0000-4000-8000-000000000008", minQuantity: 20, maxQuantity: 49, pricePerUnit: 410.00 },
      { id: "d1000000-0000-4000-8000-000000000009", minQuantity: 50, maxQuantity: null, pricePerUnit: 370.00 },
    ],
  },
  {
    id: "c1000000-0000-4000-8000-000000000004",
    name: "Organic Turmeric Powder",
    description: "Aromatic turmeric powder packed for grocery retailers and food distributors. High curcumin content.",
    price: 140.00,
    stock: 300,
    minOrderQuantity: 10,
    unit: "packet",
    imageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600",
    isActive: true,
    isFeatured: false,
    categoryId: "701769aa-8dfd-43f5-9f28-0d7ba507a6a0", // Food & Beverages
    businessId: "b1000000-0000-4000-8000-000000000004",
    bulkPricing: [
      { id: "d1000000-0000-4000-8000-000000000010", minQuantity: 10, maxQuantity: 24, pricePerUnit: 140.00 },
      { id: "d1000000-0000-4000-8000-000000000011", minQuantity: 25, maxQuantity: 49, pricePerUnit: 125.00 },
      { id: "d1000000-0000-4000-8000-000000000012", minQuantity: 50, maxQuantity: null, pricePerUnit: 110.00 },
    ],
  },
  {
    id: "c1000000-0000-4000-8000-000000000005",
    name: "Decorative Ceramic Planters",
    description: "Glazed indoor ceramic planters with drainage holes and saucers. Suitable for succulents and houseplants.",
    price: 250.00,
    stock: 12,
    minOrderQuantity: 8,
    unit: "piece",
    imageUrl: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600",
    isActive: true,
    isFeatured: false,
    categoryId: "53a2d5f1-baaa-4928-ab5c-75639a452c50", // Home & Kitchen
    businessId: "b1000000-0000-4000-8000-000000000005",
    bulkPricing: [
      { id: "d1000000-0000-4000-8000-000000000013", minQuantity: 8, maxQuantity: 19, pricePerUnit: 250.00 },
      { id: "d1000000-0000-4000-8000-000000000014", minQuantity: 20, maxQuantity: 49, pricePerUnit: 220.00 },
      { id: "d1000000-0000-4000-8000-000000000015", minQuantity: 50, maxQuantity: null, pricePerUnit: 195.00 },
    ],
  },
  {
    id: "c1000000-0000-4000-8000-000000000006",
    name: "Cotton Kurta Fabric",
    description: "Unstitched cotton fabric for ethnic wear and men kurti. Soft breathable fabric in running lengths.",
    price: 160.00,
    stock: 1000,
    minOrderQuantity: 20,
    unit: "metre",
    imageUrl: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600",
    isActive: true,
    isFeatured: false,
    categoryId: "e3e5b3c7-b7d0-423d-b876-f9bc53cdcbaa", // Clothing & Textiles
    businessId: "b1000000-0000-4000-8000-000000000006",
    bulkPricing: [
      { id: "d1000000-0000-4000-8000-000000000016", minQuantity: 20, maxQuantity: 99, pricePerUnit: 160.00 },
      { id: "d1000000-0000-4000-8000-000000000017", minQuantity: 100, maxQuantity: 299, pricePerUnit: 145.00 },
      { id: "d1000000-0000-4000-8000-000000000018", minQuantity: 300, maxQuantity: null, pricePerUnit: 130.00 },
    ],
  },
  {
    id: "c1000000-0000-4000-8000-000000000007",
    name: "Jute Gift Bags - Clearance",
    description: "Eco-friendly printed jute gift bags with padded cane handles. Clearance batch.",
    price: 55.00,
    stock: 0,
    minOrderQuantity: 25,
    unit: "piece",
    imageUrl: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=600",
    isActive: false, // Inactive/Out of stock
    isFeatured: false,
    categoryId: "53a2d5f1-baaa-4928-ab5c-75639a452c50", // Home & Kitchen
    businessId: "b1000000-0000-4000-8000-000000000007",
    bulkPricing: [],
  },
  {
    id: "c1000000-0000-4000-8000-000000000008",
    name: "LED Desk Lamp",
    description: "Adjustable folding LED desk lamp with 3 colour modes, touch dimmer, and 2000mAh rechargeable battery.",
    price: 380.00,
    stock: 18,
    minOrderQuantity: 5,
    unit: "piece",
    imageUrl: "https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=600",
    isActive: true,
    isFeatured: false,
    categoryId: "815ef527-5348-4c5f-9b1e-5d1695eb6535", // Electronics
    businessId: "b1000000-0000-4000-8000-000000000002",
    bulkPricing: [
      { id: "d1000000-0000-4000-8000-000000000019", minQuantity: 5, maxQuantity: 19, pricePerUnit: 380.00 },
      { id: "d1000000-0000-4000-8000-000000000020", minQuantity: 20, maxQuantity: 49, pricePerUnit: 345.00 },
      { id: "d1000000-0000-4000-8000-000000000021", minQuantity: 50, maxQuantity: null, pricePerUnit: 310.00 },
    ],
  },
  {
    id: "c1000000-0000-4000-8000-000000000009",
    name: "Roasted Peanut Snack Packs",
    description: "Salted roasted peanuts in 50g nitrogen-flushed foil packs. High shelf life for retail and hospitality.",
    price: 25.00,
    stock: 2000,
    minOrderQuantity: 50,
    unit: "packet",
    imageUrl: "https://images.unsplash.com/photo-1567892323821-4c125df95a0a?w=600",
    isActive: true,
    isFeatured: false,
    categoryId: "701769aa-8dfd-43f5-9f28-0d7ba507a6a0", // Food & Beverages
    businessId: "b1000000-0000-4000-8000-000000000004",
    bulkPricing: [
      { id: "d1000000-0000-4000-8000-000000000022", minQuantity: 50, maxQuantity: 99, pricePerUnit: 25.00 },
      { id: "d1000000-0000-4000-8000-000000000023", minQuantity: 100, maxQuantity: 499, pricePerUnit: 22.00 },
      { id: "d1000000-0000-4000-8000-000000000024", minQuantity: 500, maxQuantity: null, pricePerUnit: 19.00 },
    ],
  },
  {
    id: "c1000000-0000-4000-8000-000000000010",
    name: "Hand-painted Wooden Coasters",
    description: "Set of 6 handcrafted wooden tea coasters with heat-resistant lacquer finish and traditional folk art motifs.",
    price: 120.00,
    stock: 300,
    minOrderQuantity: 10,
    unit: "set",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600",
    isActive: true,
    isFeatured: false,
    categoryId: "53a2d5f1-baaa-4928-ab5c-75639a452c50", // Home & Kitchen
    businessId: "b1000000-0000-4000-8000-000000000003",
    bulkPricing: [
      { id: "d1000000-0000-4000-8000-000000000025", minQuantity: 10, maxQuantity: 24, pricePerUnit: 120.00 },
      { id: "d1000000-0000-4000-8000-000000000026", minQuantity: 25, maxQuantity: 49, pricePerUnit: 105.00 },
      { id: "d1000000-0000-4000-8000-000000000027", minQuantity: 50, maxQuantity: null, pricePerUnit: 90.00 },
    ],
  },
];

async function seedMarketplaceCatalog() {
  console.log("Seeding marketplace sellers, businesses, and catalog products...");

  // 1. Seed Seller Users
  for (const user of SELLER_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name, role: user.role },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }
  console.log(`- Upserted ${SELLER_USERS.length} seller users`);

  // 2. Seed Businesses
  for (const biz of SELLER_BUSINESSES) {
    await prisma.business.upsert({
      where: { id: biz.id },
      update: {
        name: biz.name,
        description: biz.description,
        category: biz.category,
        city: biz.city,
        state: biz.state,
        pincode: biz.pincode,
        phone: biz.phone,
        email: biz.email,
      },
      create: {
        id: biz.id,
        ownerId: biz.ownerId,
        name: biz.name,
        description: biz.description,
        category: biz.category,
        city: biz.city,
        state: biz.state,
        pincode: biz.pincode,
        phone: biz.phone,
        email: biz.email,
      },
    });
  }
  console.log(`- Upserted ${SELLER_BUSINESSES.length} businesses`);

  // 3. Seed Products and Bulk Pricing
  for (const prod of MARKETPLACE_PRODUCTS) {
    const { bulkPricing, ...productData } = prod;
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        stock: productData.stock,
        minOrderQuantity: productData.minOrderQuantity,
        unit: productData.unit,
        imageUrl: productData.imageUrl,
        isActive: productData.isActive,
        isFeatured: productData.isFeatured,
        categoryId: productData.categoryId,
        businessId: productData.businessId,
      },
      create: productData,
    });

    if (Array.isArray(bulkPricing) && bulkPricing.length > 0) {
      for (const tier of bulkPricing) {
        await prisma.bulkPricing.upsert({
          where: { id: tier.id },
          update: {
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            pricePerUnit: tier.pricePerUnit,
          },
          create: {
            id: tier.id,
            productId: prod.id,
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            pricePerUnit: tier.pricePerUnit,
          },
        });
      }
    }
  }
  console.log(`- Upserted ${MARKETPLACE_PRODUCTS.length} marketplace products with bulk pricing`);
  console.log("Marketplace catalog seeding complete.");
}

seedMarketplaceCatalog()
  .catch((err) => {
    console.error("Error seeding marketplace catalog:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
