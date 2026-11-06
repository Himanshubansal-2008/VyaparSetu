/**
 * Realistic sample products and bulk pricing tiers for VyaparSetu marketplace
 * Covering all 10 standard categories with realistic wholesale pricing, MOQs, and units.
 */

const sampleProducts = [
  // ---------------------------------------------------------------------------
  // 1. Category: Electronics
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000001",
    name: "9W B22 LED Cool Day Light Bulbs (Pack of 10)",
    description: "Energy efficient 9-watt LED bulbs with B22 base. Delivers 850 lumens of cool white light with 25,000 hours lifespan.",
    price: 650.00,
    stock: 500,
    minOrderQuantity: 5,
    unit: "packet",
    imageUrl: null,
    isActive: true,
    isFeatured: true,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Electronics",
    businessIndex: 0,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000001", minQuantity: 5, maxQuantity: 19, pricePerUnit: 620.00 },
      { id: "b1000000-0000-4000-8000-000000000002", minQuantity: 20, maxQuantity: 49, pricePerUnit: 580.00 },
      { id: "b1000000-0000-4000-8000-000000000003", minQuantity: 50, maxQuantity: null, pricePerUnit: 540.00 },
    ],
  },
  {
    id: "e1000000-0000-4000-8000-000000000002",
    name: "Braided Fast Charging USB-C Cables (1 Metre)",
    description: "Nylon braided USB Type-C charging and sync cables supporting up to 65W fast charge and 480Mbps data transfer.",
    price: 180.00,
    stock: 1200,
    minOrderQuantity: 20,
    unit: "piece",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Electronics",
    businessIndex: 1,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000004", minQuantity: 20, maxQuantity: 99, pricePerUnit: 160.00 },
      { id: "b1000000-0000-4000-8000-000000000005", minQuantity: 100, maxQuantity: null, pricePerUnit: 140.00 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Category: Clothing & Textiles
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000003",
    name: "Plain Round Neck Cotton T-Shirts (Bio-Washed)",
    description: "180 GSM 100% combed cotton blank t-shirts suitable for screen printing, direct-to-garment, and retail embroidery.",
    price: 220.00,
    stock: 800,
    minOrderQuantity: 25,
    unit: "piece",
    imageUrl: null,
    isActive: true,
    isFeatured: true,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Clothing & Textiles",
    businessIndex: 0,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000006", minQuantity: 25, maxQuantity: 99, pricePerUnit: 200.00 },
      { id: "b1000000-0000-4000-8000-000000000007", minQuantity: 100, maxQuantity: 499, pricePerUnit: 185.00 },
      { id: "b1000000-0000-4000-8000-000000000008", minQuantity: 500, maxQuantity: null, pricePerUnit: 170.00 },
    ],
  },
  {
    id: "e1000000-0000-4000-8000-000000000004",
    name: "Heavyweight Indigo Denim Fabric (14 Oz)",
    description: "100% cotton twill raw indigo denim fabric with 58-inch width. Ideal for jeans, jackets, and heavy upholstery.",
    price: 310.00,
    stock: 1500,
    minOrderQuantity: 50,
    unit: "metre",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: true,
    surplusQuantity: 300,
    surplusPrice: 260.00,
    surplusDeadline: new Date("2026-12-31T23:59:59.000Z"),
    categoryName: "Clothing & Textiles",
    businessIndex: 1,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000009", minQuantity: 50, maxQuantity: 199, pricePerUnit: 295.00 },
      { id: "b1000000-0000-4000-8000-000000000010", minQuantity: 200, maxQuantity: null, pricePerUnit: 275.00 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Category: Food & Beverages
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000005",
    name: "Organic Whole Black Pepper (Malabar Grade)",
    description: "Single-origin sun-dried black peppercorns sourced from Wayanad, Kerala. High piperine content with pungent aroma.",
    price: 750.00,
    stock: 400,
    minOrderQuantity: 10,
    unit: "kg",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Food & Beverages",
    businessIndex: 0,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000011", minQuantity: 10, maxQuantity: 49, pricePerUnit: 710.00 },
      { id: "b1000000-0000-4000-8000-000000000012", minQuantity: 50, maxQuantity: null, pricePerUnit: 675.00 },
    ],
  },
  {
    id: "e1000000-0000-4000-8000-000000000006",
    name: "Assam CTC Black Tea (Dust Grade, Bulk Sacks)",
    description: "Strong malty Assam orthodox-blend CTC black tea in bulk food-grade sacks. Excellent liquor strength for commercial brewing.",
    price: 320.00,
    stock: 600,
    minOrderQuantity: 25,
    unit: "kg",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Food & Beverages",
    businessIndex: 1,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000013", minQuantity: 25, maxQuantity: 99, pricePerUnit: 300.00 },
      { id: "b1000000-0000-4000-8000-000000000014", minQuantity: 100, maxQuantity: null, pricePerUnit: 280.00 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. Category: Furniture
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000007",
    name: "Stackable Plastic Armless Cafe Chairs",
    description: "Molded virgin polypropylene chairs with UV stabilization. Waterproof and stackable up to 10 units high for cafes and banquet halls.",
    price: 550.00,
    stock: 350,
    minOrderQuantity: 12,
    unit: "piece",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Furniture",
    businessIndex: 0,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000015", minQuantity: 12, maxQuantity: 47, pricePerUnit: 510.00 },
      { id: "b1000000-0000-4000-8000-000000000016", minQuantity: 48, maxQuantity: null, pricePerUnit: 475.00 },
    ],
  },
  {
    id: "e1000000-0000-4000-8000-000000000008",
    name: "Solid Teak Wood Dining Chairs (Classic Slatted Back)",
    description: "Kiln-dried seasoned teak wood chairs with dark walnut finish and ergonomic lumbar backrest. Built for restaurants and hotels.",
    price: 2800.00,
    stock: 80,
    minOrderQuantity: 4,
    unit: "piece",
    imageUrl: null,
    isActive: true,
    isFeatured: true,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Furniture",
    businessIndex: 1,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000017", minQuantity: 4, maxQuantity: 15, pricePerUnit: 2600.00 },
      { id: "b1000000-0000-4000-8000-000000000018", minQuantity: 16, maxQuantity: null, pricePerUnit: 2450.00 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. Category: Home & Kitchen
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000009",
    name: "Airtight Food Storage Containers (Set of 4)",
    description: "BPA-free transparent food containers with silicone gasket locking lids. Capacities: 500ml, 1L, 1.5L, and 2L.",
    price: 380.00,
    stock: 450,
    minOrderQuantity: 10,
    unit: "box",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Home & Kitchen",
    businessIndex: 0,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000019", minQuantity: 10, maxQuantity: 49, pricePerUnit: 350.00 },
      { id: "b1000000-0000-4000-8000-000000000020", minQuantity: 50, maxQuantity: null, pricePerUnit: 320.00 },
    ],
  },
  {
    id: "e1000000-0000-4000-8000-000000000010",
    name: "Disposable Ripple Wall Paper Cups (250ml, Pack of 50)",
    description: "Triple-layer insulated ripple paper cups for hot coffee and tea takeaway. Leakproof PE lining with heat-insulating exterior.",
    price: 160.00,
    stock: 1000,
    minOrderQuantity: 20,
    unit: "packet",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Home & Kitchen",
    businessIndex: 1,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000021", minQuantity: 20, maxQuantity: 99, pricePerUnit: 145.00 },
      { id: "b1000000-0000-4000-8000-000000000022", minQuantity: 100, maxQuantity: null, pricePerUnit: 130.00 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. Category: Beauty & Personal Care
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000011",
    name: "Natural Aloe Vera Gel (500ml Tub)",
    description: "99% pure cold-pressed aloe vera moisturizing gel without artificial color or fragrance. Suitable for skin and hair care.",
    price: 240.00,
    stock: 600,
    minOrderQuantity: 12,
    unit: "piece",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Beauty & Personal Care",
    businessIndex: 0,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000023", minQuantity: 12, maxQuantity: 59, pricePerUnit: 215.00 },
      { id: "b1000000-0000-4000-8000-000000000024", minQuantity: 60, maxQuantity: null, pricePerUnit: 190.00 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. Category: Industrial Supplies
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000012",
    name: "Heavy Duty Nitrile Coated Safety Gloves",
    description: "Seamless knitted nylon liner with microporous nitrile palm coating. Abrasion and cut resistant for industrial handling and construction.",
    price: 75.00,
    stock: 2500,
    minOrderQuantity: 50,
    unit: "piece",
    imageUrl: null,
    isActive: true,
    isFeatured: true,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Industrial Supplies",
    businessIndex: 1,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000025", minQuantity: 50, maxQuantity: 199, pricePerUnit: 68.00 },
      { id: "b1000000-0000-4000-8000-000000000026", minQuantity: 200, maxQuantity: 999, pricePerUnit: 62.00 },
      { id: "b1000000-0000-4000-8000-000000000027", minQuantity: 1000, maxQuantity: null, pricePerUnit: 55.00 },
    ],
  },
  {
    id: "e1000000-0000-4000-8000-000000000013",
    name: "Industrial Stainless Steel Hex Bolts M10 (Pack of 100)",
    description: "Grade 304 stainless steel metric hex head machine bolts with matching nuts and spring washers.",
    price: 680.00,
    stock: 300,
    minOrderQuantity: 5,
    unit: "box",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Industrial Supplies",
    businessIndex: 0,
    bulkPricing: [], // Deliberate test product without bulk pricing tiers
  },

  // ---------------------------------------------------------------------------
  // 8. Category: Agriculture
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000014",
    name: "Forged Steel Garden Hoe & Cultivator with Wooden Handle",
    description: "Dual-head tempered carbon steel garden hoe and 3-prong cultivator with 48-inch polished ash wood handle.",
    price: 420.00,
    stock: 280,
    minOrderQuantity: 10,
    unit: "piece",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Agriculture",
    businessIndex: 1,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000028", minQuantity: 10, maxQuantity: 49, pricePerUnit: 380.00 },
      { id: "b1000000-0000-4000-8000-000000000029", minQuantity: 50, maxQuantity: null, pricePerUnit: 345.00 },
    ],
  },
  {
    id: "e1000000-0000-4000-8000-000000000015",
    name: "High-Density Polyethylene Drip Irrigation Pipe (16mm, 100m Roll)",
    description: "Class 2 UV stabilized HDPE lateral pipe for agricultural micro-irrigation systems. Operating pressure 2.5 kg/cm².",
    price: 1250.00,
    stock: 180,
    minOrderQuantity: 4,
    unit: "piece",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: true,
    surplusQuantity: 30,
    surplusPrice: 1050.00,
    surplusDeadline: new Date("2026-11-30T23:59:59.000Z"),
    categoryName: "Agriculture",
    businessIndex: 0,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000030", minQuantity: 4, maxQuantity: 19, pricePerUnit: 1180.00 },
      { id: "b1000000-0000-4000-8000-000000000031", minQuantity: 20, maxQuantity: null, pricePerUnit: 1100.00 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 9. Category: Stationery & Office Supplies
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000016",
    name: "Hardcover Spiral Ruled Notebooks A5 (Pack of 12)",
    description: "200-page 80 GSM natural shade paper notebooks with matte laminated waterproof hardcover and twin wire binding.",
    price: 720.00,
    stock: 400,
    minOrderQuantity: 5,
    unit: "dozen",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Stationery & Office Supplies",
    businessIndex: 1,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000032", minQuantity: 5, maxQuantity: 19, pricePerUnit: 670.00 },
      { id: "b1000000-0000-4000-8000-000000000033", minQuantity: 20, maxQuantity: null, pricePerUnit: 610.00 },
    ],
  },
  {
    id: "e1000000-0000-4000-8000-000000000017",
    name: "Ballpoint Pens 0.7mm Blue Ink (Box of 50)",
    description: "Smooth low-viscosity blue ink ballpoint pens with rubberized non-slip grip. Ideal for schools, offices, and billing counters.",
    price: 350.00,
    stock: 700,
    minOrderQuantity: 10,
    unit: "box",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Stationery & Office Supplies",
    businessIndex: 0,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000034", minQuantity: 10, maxQuantity: 49, pricePerUnit: 320.00 },
      { id: "b1000000-0000-4000-8000-000000000035", minQuantity: 50, maxQuantity: null, pricePerUnit: 290.00 },
    ],
  },

  // ---------------------------------------------------------------------------
  // 10. Category: Packaging Materials
  // ---------------------------------------------------------------------------
  {
    id: "e1000000-0000-4000-8000-000000000018",
    name: "3-Ply Corrugated Shipping Boxes (12x10x8 Inches, Bundle of 25)",
    description: "Heavy-duty kraft paper corrugated cardboard shipping boxes with 150 GSM fluting. High burst factor for ecommerce shipping.",
    price: 520.00,
    stock: 600,
    minOrderQuantity: 8,
    unit: "bundle",
    imageUrl: null,
    isActive: true,
    isFeatured: false,
    isSurplus: false,
    surplusQuantity: 0,
    surplusPrice: null,
    surplusDeadline: null,
    categoryName: "Packaging Materials",
    businessIndex: 1,
    bulkPricing: [
      { id: "b1000000-0000-4000-8000-000000000036", minQuantity: 8, maxQuantity: 31, pricePerUnit: 480.00 },
      { id: "b1000000-0000-4000-8000-000000000037", minQuantity: 32, maxQuantity: 99, pricePerUnit: 440.00 },
      { id: "b1000000-0000-4000-8000-000000000038", minQuantity: 100, maxQuantity: null, pricePerUnit: 400.00 },
    ],
  },
];

/**
 * Validates prerequisites and builds idempotent product seed payloads.
 *
 * @param {Array<{ id: string, name: string }>} categories - Existing categories from database
 * @param {Array<{ id: string, name: string }>} businesses - Existing businesses from database
 * @returns {Array<Object>} Prepared product records with resolved categoryId and businessId
 */
function prepareProductSeedData(categories, businesses) {
  if (!businesses || businesses.length === 0) {
    throw new Error(
      "Missing prerequisite: No Business records found in database. Products require a valid businessId foreign key."
    );
  }

  const categoryMap = new Map();
  for (const cat of categories) {
    categoryMap.set(cat.name.trim().toLowerCase(), cat.id);
  }

  return sampleProducts.map((p, idx) => {
    const categoryId = categoryMap.get(p.categoryName.trim().toLowerCase());
    if (!categoryId) {
      throw new Error(
        `Category '${p.categoryName}' does not exist in the database. Please ensure categories are seeded first.`
      );
    }

    const business = businesses[(p.businessIndex !== undefined ? p.businessIndex : idx) % businesses.length];

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      minOrderQuantity: p.minOrderQuantity,
      unit: p.unit,
      imageUrl: p.imageUrl,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      isSurplus: p.isSurplus,
      surplusQuantity: p.surplusQuantity,
      surplusPrice: p.surplusPrice,
      surplusDeadline: p.surplusDeadline,
      categoryId,
      businessId: business.id,
      bulkPricing: p.bulkPricing || [],
    };
  });
}

module.exports = {
  sampleProducts,
  prepareProductSeedData,
};
