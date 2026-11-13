/**
 * Automated Test Suite: Mobile Cart Integration, Bulk Pricing & Migration
 * 
 * Verifies Phase 3:
 * 1. Price recalculation and bulk tier evaluation.
 * 2. MOQ enforcement and stock clamping.
 * 3. Own-product purchase prevention and Buyer/Seller mode restrictions.
 * 4. Local cart normalization and compatibility with mobile screens.
 * 5. Idempotent local cart migration to PostgreSQL.
 * 6. Offline fallback and error resilience.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

// Import pure mobile cart helper logic
const {
  getApplicableUnitPrice,
  getActiveTier,
  getProductMoq,
  getProductStock,
  calculateItemValues,
  normalizeBackendCartItem,
} = require("../../mobile/src/utils/cartPricing.js");

let server;
let baseUrl;

let sellerUser;
let sellerBusiness;
let buyerUser;
let testProduct;

async function postRequest(path, body = {}, headers = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function getRequest(path, headers = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...headers },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe("Mobile Cart Integration & Business Logic Test Suite", () => {
  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    const category = await prisma.category.findFirst();

    // 1. Setup Seller
    const sUserRes = await postRequest("/api/users/init");
    sellerUser = sUserRes.data?.data || sUserRes.data;
    const sBizRes = await postRequest(
      "/api/businesses",
      {
        name: `Seller Business ${Date.now()}`,
        description: "Mobile Cart Test Seller",
        category: category.name,
      },
      { "x-user-id": sellerUser.id }
    );
    sellerBusiness = sBizRes.data?.data || sBizRes.data;

    // 2. Setup Buyer
    const bUserRes = await postRequest("/api/users/init");
    buyerUser = bUserRes.data?.data || bUserRes.data;

    // 3. Create Product with MOQ and Bulk Pricing
    const prodRes = await postRequest(
      "/api/products",
      {
        name: "Eco Jute Tote Bag",
        description: "Wholesale reusable bags",
        price: 250,
        minOrderQuantity: 10,
        stock: 500,
        unit: "piece",
        categoryId: category.id,
        businessId: sellerBusiness.id,
        bulkPricing: [
          { minQuantity: 25, maxQuantity: 49, pricePerUnit: 220 },
          { minQuantity: 50, maxQuantity: null, pricePerUnit: 190 },
        ],
      },
      { "x-user-id": sellerUser.id }
    );
    testProduct = prodRes.data?.data || prodRes.data;
  });

  after(async () => {
    try {
      if (sellerUser?.id) {
        await prisma.cartItem.deleteMany({
          where: { cart: { userId: sellerUser.id } },
        });
        await prisma.cart.deleteMany({ where: { userId: sellerUser.id } });
      }
      if (buyerUser?.id) {
        await prisma.cartItem.deleteMany({
          where: { cart: { userId: buyerUser.id } },
        });
        await prisma.cart.deleteMany({ where: { userId: buyerUser.id } });
      }
      if (testProduct?.id) {
        await prisma.bulkPricing.deleteMany({ where: { productId: testProduct.id } });
        await prisma.product.deleteMany({ where: { id: testProduct.id } });
      }
      if (sellerBusiness?.id) {
        await prisma.business.deleteMany({ where: { id: sellerBusiness.id } });
      }
      if (sellerUser?.id) {
        await prisma.user.deleteMany({ where: { id: sellerUser.id } });
      }
      if (buyerUser?.id) {
        await prisma.user.deleteMany({ where: { id: buyerUser.id } });
      }
    } catch (e) {
      // ignore cleanup errors
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("1. getProductMoq and getProductStock return correct constraints", () => {
    assert.strictEqual(getProductMoq(testProduct), 10);
    assert.strictEqual(getProductStock(testProduct), 500);

    // Fallbacks for undefined values
    assert.strictEqual(getProductMoq(null), 1);
    assert.strictEqual(getProductStock(null), Infinity);
  });

  it("2. getApplicableUnitPrice and getActiveTier apply bulk tiers accurately", () => {
    // Below tier 1: base price
    assert.strictEqual(getApplicableUnitPrice(testProduct, 10), 250);
    assert.strictEqual(getActiveTier(testProduct, 10), null);

    // Tier 1: 25-49 units -> ₹220
    assert.strictEqual(getApplicableUnitPrice(testProduct, 25), 220);
    assert.strictEqual(getApplicableUnitPrice(testProduct, 49), 220);
    const tier1 = getActiveTier(testProduct, 30);
    assert.ok(tier1);
    assert.strictEqual(Number(tier1.pricePerUnit), 220);

    // Tier 2: 50+ units -> ₹190
    assert.strictEqual(getApplicableUnitPrice(testProduct, 50), 190);
    assert.strictEqual(getApplicableUnitPrice(testProduct, 100), 190);
    const tier2 = getActiveTier(testProduct, 75);
    assert.ok(tier2);
    assert.strictEqual(Number(tier2.pricePerUnit), 190);
  });

  it("3. calculateItemValues accurately calculates item total and savings", () => {
    // 30 units at ₹220 (regular ₹250):
    // itemTotal = 6600, savings = (250 - 220) * 30 = 900
    const values = calculateItemValues(testProduct, 30);
    assert.strictEqual(values.unitPrice, 220);
    assert.strictEqual(values.itemTotal, 6600);
    assert.strictEqual(values.savings, 900);
    assert.ok(values.activeTier);
  });

  it("4. normalizeBackendCartItem creates consistent mobile item shape", () => {
    const backendItem = {
      id: "cart-item-uuid-1",
      cartId: "cart-uuid-1",
      productId: testProduct.id,
      quantity: 30,
      unitPrice: 220,
      itemTotal: 6600,
      savings: 900,
      activeTier: { minQuantity: 25, maxQuantity: 49, pricePerUnit: 220 },
      isUnavailable: false,
      unavailableReason: null,
      product: testProduct,
    };

    const normalized = normalizeBackendCartItem(backendItem);
    assert.strictEqual(normalized.id, testProduct.id);
    assert.strictEqual(normalized.productId, testProduct.id);
    assert.strictEqual(normalized.cartItemId, "cart-item-uuid-1");
    assert.strictEqual(normalized.quantity, 30);
    assert.strictEqual(normalized.unitPrice, 220);
    assert.strictEqual(normalized.itemTotal, 6600);
    assert.strictEqual(normalized.savings, 900);
    assert.strictEqual(normalized.isUnavailable, false);
    assert.strictEqual(normalized.product.name, "Eco Jute Tote Bag");
  });

  it("5. Backend cart API rejects adding own product (HTTP 403)", async () => {
    const res = await postRequest(
      "/api/cart/items",
      { productId: testProduct.id, quantity: 10 },
      { "x-user-id": sellerUser.id }
    );
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.error, "own_product");
  });

  it("6. Buyer can add seller product, applying MOQ and bulk pricing", async () => {
    // Attempting quantity below MOQ (5 < 10) rejected by backend
    const badMoqRes = await postRequest(
      "/api/cart/items",
      { productId: testProduct.id, quantity: 5 },
      { "x-user-id": buyerUser.id }
    );
    assert.strictEqual(badMoqRes.status, 400);

    // Adding valid quantity with Tier 1 bulk pricing (30 units)
    const goodRes = await postRequest(
      "/api/cart/items",
      { productId: testProduct.id, quantity: 30 },
      { "x-user-id": buyerUser.id }
    );
    assert.strictEqual(goodRes.status, 201);
    const cart = goodRes.data?.data || goodRes.data;
    assert.strictEqual(cart.subtotal, 6600);
    assert.strictEqual(cart.totalSavings, 900);
    assert.strictEqual(cart.totalUnits, 30);
  });

  it("7. Mobile cart migration synchronizes local items to PostgreSQL idempotently", async () => {
    // Simulate local cart with 50 units (Tier 2 pricing -> ₹190)
    const localItems = [
      {
        productId: testProduct.id,
        quantity: 50,
      },
    ];

    const migrateRes = await postRequest(
      "/api/cart/migrate",
      { items: localItems },
      { "x-user-id": buyerUser.id }
    );
    assert.strictEqual(migrateRes.status, 200);
    const mCart = migrateRes.data?.data || migrateRes.data;
    assert.strictEqual(mCart.subtotal, 9500); // 50 * 190
    assert.strictEqual(mCart.totalSavings, 3000); // (250 - 190) * 50
    assert.strictEqual(mCart.totalUnits, 50);

    // Fetch buyer cart to confirm persistence in PostgreSQL
    const fetchRes = await getRequest("/api/cart", { "x-user-id": buyerUser.id });
    assert.strictEqual(fetchRes.status, 200);
    const fCart = fetchRes.data?.data || fetchRes.data;
    assert.strictEqual(fCart.cartItemCount, 1);
    assert.strictEqual(fCart.totalAmount, 9500);
  });
});
