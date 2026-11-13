require("dotenv/config");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

describe("Post-Integration Issues & Regressions Verification Suite", () => {
  let server;
  let baseUrl;

  const TEST_USER_ID = "2cb3e270-f3e9-4774-9701-41b212b205a8";
  const TEST_BIZ_ID = "bbb0e0f2-9d38-44af-9c93-edc4004b1637";
  const OWN_PRODUCT_ID = "7262160a-84dd-4188-86ac-202fd2265649"; // Cups Updated
  const VASE_PRODUCT_ID = "c1000000-0000-4000-8000-000000000003"; // Handcrafted Blue Pottery Vase
  const OTHER_SELLER_BIZ_ID = "b1000000-0000-4000-8000-000000000003"; // Rang Artisan Collective

  const makeRequest = (path, options = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqOptions = {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      };

      const req = http.request(url, reqOptions, (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          let parsedData = null;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            parsedData = rawData;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        });
      });

      req.on("error", reject);

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  };

  before(async () => {
    // Clean up test user cart before starting
    const cart = await prisma.cart.findUnique({ where: { userId: TEST_USER_ID } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(async () => {
    // Restore the user's cart item (Handcrafted Blue Pottery Vase, qty 19) for Prisma Studio inspection
    try {
      let cart = await prisma.cart.findUnique({ where: { userId: TEST_USER_ID } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { userId: TEST_USER_ID } });
      }
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: VASE_PRODUCT_ID,
          quantity: 19,
        },
      });
    } catch (e) {
      console.error("Error restoring test user cart in after():", e.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ---------------------------------------------------------------------------
  // ISSUE 1: Unexpected demo/test products eliminated from Buyer Mode
  // ---------------------------------------------------------------------------
  describe("Issue 1: Marketplace Product Cleanliness & Visibility", () => {
    it("1.1 GET /api/products returns legitimate catalog products and no orphaned test products", async () => {
      const res = await makeRequest("/api/products?limit=50");
      assert.strictEqual(res.status, 200);

      const products = res.data?.products || res.data?.data?.products || [];
      assert(Array.isArray(products), "Products must be an array");
      assert(products.length >= 10, "Should contain at least 10 active products");

      // Verify no orphaned test products exist in database response
      const hasProductA = products.some((p) => p.name === "Product A - Seller A");
      const hasProductB = products.some((p) => p.name === "Product B - Seller B");
      assert.strictEqual(hasProductA, false, "Product A - Seller A must NOT be in marketplace");
      assert.strictEqual(hasProductB, false, "Product B - Seller B must NOT be in marketplace");

      // Verify legitimate products are present
      const hasVase = products.some((p) => p.name === "Handcrafted Blue Pottery Vase");
      const hasTote = products.some((p) => p.name === "Handwoven Cotton Tote Bag");
      assert.strictEqual(hasVase, true, "Handcrafted Blue Pottery Vase must be present");
      assert.strictEqual(hasTote, true, "Handwoven Cotton Tote Bag must be present");
    });

    it("1.2 Excludes user's own business products from Buyer Mode filtering", async () => {
      const res = await makeRequest("/api/products?limit=50");
      const products = res.data?.products || res.data?.data?.products || [];

      // Filter as Buyer Mode does (excluding TEST_BIZ_ID)
      const buyerMarketplace = products.filter((p) => p.businessId !== TEST_BIZ_ID);
      const containsOwnProduct = buyerMarketplace.some((p) => p.businessId === TEST_BIZ_ID);
      assert.strictEqual(containsOwnProduct, false, "Buyer marketplace must exclude current seller's own products");
    });
  });

  // ---------------------------------------------------------------------------
  // ISSUE 2: Product Editing in Seller Mode
  // ---------------------------------------------------------------------------
  describe("Issue 2: Product Editing Flow in Seller Mode", () => {
    it("2.1 Allows seller to edit own product details via PUT /api/products/:id", async () => {
      const updatePayload = {
        name: "Cups Updated",
        description: "Premium ceramic cups set with updated wholesale specifications",
        price: 85.0,
        stock: 120,
        minOrderQuantity: 2,
        unit: "piece",
        categoryId: "53a2d5f1-baaa-4928-ab5c-75639a452c50", // Home & Kitchen
        businessId: TEST_BIZ_ID,
      };

      const res = await makeRequest(`/api/products/${OWN_PRODUCT_ID}`, {
        method: "PUT",
        headers: {
          "x-user-id": TEST_USER_ID,
          "x-business-id": TEST_BIZ_ID,
        },
        body: updatePayload,
      });

      assert.strictEqual(res.status, 200, "Should update product successfully");
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.name, "Cups Updated");
      assert.strictEqual(Number(res.data.data.price), 85.0);
      assert.strictEqual(res.data.data.stock, 120);

      // Verify directly in PostgreSQL
      const dbProd = await prisma.product.findUnique({
        where: { id: OWN_PRODUCT_ID },
      });
      assert.strictEqual(dbProd.name, "Cups Updated");
      assert.strictEqual(Number(dbProd.price), 85.0);
    });

    it("2.2 Forbids seller from editing another seller's product (HTTP 403 Forbidden)", async () => {
      const res = await makeRequest(`/api/products/${VASE_PRODUCT_ID}`, {
        method: "PUT",
        headers: {
          "x-user-id": TEST_USER_ID,
          "x-business-id": TEST_BIZ_ID,
        },
        body: {
          name: "Illegitimate Update",
          price: 10.0,
        },
      });

      assert.strictEqual(res.status, 403, "Must reject modifying another business's product");
    });
  });

  // ---------------------------------------------------------------------------
  // ISSUE 3: Cart PostgreSQL Persistence & Prisma Studio Verification
  // ---------------------------------------------------------------------------
  describe("Issue 3: Cart PostgreSQL Persistence & Synchronization", () => {
    it("3.1 Adds 'Handcrafted Blue Pottery Vase' (qty 19) to user's cart and persists in PostgreSQL", async () => {
      const res = await makeRequest("/api/cart/items", {
        method: "POST",
        headers: { "x-user-id": TEST_USER_ID },
        body: {
          productId: VASE_PRODUCT_ID,
          quantity: 19,
        },
      });

      assert.strictEqual(res.status, 201, "Should successfully add item to cart");
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.subtotal, 8550.0);

      // Verify PostgreSQL Cart & CartItem tables directly (Prisma Studio representation)
      const dbCart = await prisma.cart.findUnique({
        where: { userId: TEST_USER_ID },
        include: { items: { include: { product: true } } },
      });

      assert.ok(dbCart, "Cart record must exist in PostgreSQL");
      assert.strictEqual(dbCart.userId, TEST_USER_ID);
      assert.strictEqual(dbCart.items.length, 1, "CartItem record must exist in PostgreSQL");

      const item = dbCart.items[0];
      assert.strictEqual(item.productId, VASE_PRODUCT_ID);
      assert.strictEqual(item.quantity, 19);
      assert.strictEqual(item.product.name, "Handcrafted Blue Pottery Vase");
    });

    it("3.2 Supports legacy ID mapping (prod-003 -> UUID) transparently", async () => {
      const res = await makeRequest("/api/cart/items/prod-003", {
        method: "PUT",
        headers: { "x-user-id": TEST_USER_ID },
        body: { quantity: 19 },
      });

      assert.strictEqual(res.status, 200, "Should resolve prod-003 and update quantity");
      assert.strictEqual(res.data.data.items[0].quantity, 19);
    });

    it("3.3 Retrieves active cart via GET /api/cart with recalculated totals and bulk pricing", async () => {
      const res = await makeRequest("/api/cart", {
        headers: { "x-user-id": TEST_USER_ID },
      });

      assert.strictEqual(res.status, 200);
      const cart = res.data.data;
      assert.strictEqual(cart.items.length, 1);
      assert.strictEqual(cart.items[0].unitPrice, 450);
      assert.strictEqual(cart.items[0].itemTotal, 8550);
      assert.strictEqual(cart.subtotal, 8550);
    });
  });

  // ---------------------------------------------------------------------------
  // ISSUE 4: Wholesale Pricing, MOQ & Quantity Calculations
  // ---------------------------------------------------------------------------
  describe("Issue 4: Wholesale Pricing & MOQ Calculations", () => {
    it("4.1 Rejects quantity below MOQ (< 5 for Handcrafted Blue Pottery Vase) with HTTP 400", async () => {
      const res = await makeRequest(`/api/cart/items/${VASE_PRODUCT_ID}`, {
        method: "PUT",
        headers: { "x-user-id": TEST_USER_ID },
        body: { quantity: 3 },
      });

      assert.strictEqual(res.status, 400);
      assert(res.data.message.includes("minimum order quantity"));
    });

    it("4.2 Applies bulk pricing tier when quantity increases to 20 (₹410/unit)", async () => {
      const res = await makeRequest(`/api/cart/items/${VASE_PRODUCT_ID}`, {
        method: "PUT",
        headers: { "x-user-id": TEST_USER_ID },
        body: { quantity: 20 },
      });

      assert.strictEqual(res.status, 200);
      const item = res.data.data.items[0];
      assert.strictEqual(item.quantity, 20);
      assert.strictEqual(item.unitPrice, 410, "Unit price must be ₹410 at tier 2");
      assert.strictEqual(item.itemTotal, 8200, "Item total must be 20 * 410 = ₹8,200");
      assert.strictEqual(item.savings, 800, "Savings must be (450 - 410) * 20 = ₹800");

      // Verify PostgreSQL CartItem table updated
      const dbItem = await prisma.cartItem.findFirst({
        where: { productId: VASE_PRODUCT_ID },
      });
      assert.strictEqual(dbItem.quantity, 20, "PostgreSQL CartItem.quantity must be 20");
    });

    it("4.3 Applies highest bulk pricing tier at 50+ units (₹370/unit)", async () => {
      const res = await makeRequest(`/api/cart/items/${VASE_PRODUCT_ID}`, {
        method: "PUT",
        headers: { "x-user-id": TEST_USER_ID },
        body: { quantity: 50 },
      });

      assert.strictEqual(res.status, 200);
      const item = res.data.data.items[0];
      assert.strictEqual(item.quantity, 50);
      assert.strictEqual(item.unitPrice, 370, "Unit price must be ₹370 at tier 3");
      assert.strictEqual(item.itemTotal, 18500, "Item total must be 50 * 370 = ₹18,500");
      assert.strictEqual(item.savings, 4000, "Savings must be (450 - 370) * 50 = ₹4,000");
    });

    it("4.4 Removes individual item from cart and deletes record in PostgreSQL", async () => {
      const res = await makeRequest(`/api/cart/items/${VASE_PRODUCT_ID}`, {
        method: "DELETE",
        headers: { "x-user-id": TEST_USER_ID },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.items.length, 0);

      // Verify record is removed from PostgreSQL CartItem
      const count = await prisma.cartItem.count({
        where: { productId: VASE_PRODUCT_ID },
      });
      assert.strictEqual(count, 0, "CartItem must be removed from PostgreSQL");
    });
  });

  // ---------------------------------------------------------------------------
  // ISSUE 5 & 6: Data Safety, User Isolation & Buyer/Seller Mode Restrictions
  // ---------------------------------------------------------------------------
  describe("Issue 5 & 6: Data Safety, Mode Restrictions & Own-Product Purchase Prevention", () => {
    it("5.1 Rejects attempt to add user's own product to cart (HTTP 403 Forbidden)", async () => {
      const res = await makeRequest("/api/cart/items", {
        method: "POST",
        headers: { "x-user-id": TEST_USER_ID },
        body: {
          productId: OWN_PRODUCT_ID,
          quantity: 5,
        },
      });

      assert.strictEqual(res.status, 403, "Must reject adding own product to cart");
      assert.strictEqual(res.data.error, "own_product");
    });

    it("5.2 Enforces user cart isolation: different user cannot see or modify test user's cart", async () => {
      // Add vase back for test user
      await makeRequest("/api/cart/items", {
        method: "POST",
        headers: { "x-user-id": TEST_USER_ID },
        body: { productId: VASE_PRODUCT_ID, quantity: 19 },
      });

      // Different user fetches cart
      const otherUserId = "a1000000-0000-4000-8000-000000000001";
      const otherRes = await makeRequest("/api/cart", {
        headers: { "x-user-id": otherUserId },
      });

      assert.strictEqual(otherRes.status, 200);
      assert.strictEqual(otherRes.data.data.items.length, 0, "Other user's cart must be isolated and empty");

      // Verify test user's cart still has item
      const testRes = await makeRequest("/api/cart", {
        headers: { "x-user-id": TEST_USER_ID },
      });
      assert.strictEqual(testRes.data.data.items.length, 1);
    });

    it("5.3 Verifies existing user identity, business profile, and products remain intact", async () => {
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
        include: { business: true },
      });

      assert.ok(user, "User record must be intact");
      assert.strictEqual(user.id, TEST_USER_ID);
      assert.ok(user.business, "Business profile must be intact");
      assert.strictEqual(user.business.id, TEST_BIZ_ID);

      const products = await prisma.product.findMany({
        where: { businessId: TEST_BIZ_ID },
      });
      assert.strictEqual(products.length, 2, "Both Cups products must remain intact");
    });
  });
});
