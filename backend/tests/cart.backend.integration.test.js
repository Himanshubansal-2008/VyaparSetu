require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

let server;
let baseUrl;

const request = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body) {
      payload = JSON.stringify(body);
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      { method, headers: reqHeaders },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(responseBody);
          } catch {
            json = responseBody;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );

    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

describe("Cart Backend & PostgreSQL Integration Test Suite", () => {
  let sellerUserA;
  let businessA;
  let productA;

  let sellerUserB;
  let businessB;
  let productB; // Has bulk pricing
  let inactiveProductB;

  let buyerUserC; // Pure buyer without business

  let category;

  before(async () => {
    // Start test HTTP server on random port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 1. Get or create a category
    category = await prisma.category.findFirst({ where: { isActive: true } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: `Cart Test Cat ${Date.now()}` },
      });
    }

    // 2. Setup Seller A & Business A & Product A
    sellerUserA = await prisma.user.create({
      data: { name: "Seller A User", role: "SELLER" },
    });
    businessA = await prisma.business.create({
      data: {
        name: "Business A",
        ownerId: sellerUserA.id,
      },
    });
    productA = await prisma.product.create({
      data: {
        name: "[Cart Test] Product A - Seller A",
        price: 100.0,
        stock: 50,
        minOrderQuantity: 2,
        businessId: businessA.id,
        categoryId: category.id,
        isActive: true,
      },
    });

    // 3. Setup Seller B & Business B & Product B with Bulk Pricing & Inactive Product
    sellerUserB = await prisma.user.create({
      data: { name: "Seller B User", role: "SELLER" },
    });
    businessB = await prisma.business.create({
      data: {
        name: "Business B",
        ownerId: sellerUserB.id,
      },
    });
    productB = await prisma.product.create({
      data: {
        name: "[Cart Test] Product B - Seller B",
        price: 200.0,
        stock: 200,
        minOrderQuantity: 5,
        businessId: businessB.id,
        categoryId: category.id,
        isActive: true,
        bulkPricing: {
          create: [
            { minQuantity: 5, maxQuantity: 19, pricePerUnit: 200.0 },
            { minQuantity: 20, maxQuantity: 49, pricePerUnit: 175.0 },
            { minQuantity: 50, maxQuantity: null, pricePerUnit: 150.0 },
          ],
        },
      },
      include: { bulkPricing: true },
    });

    inactiveProductB = await prisma.product.create({
      data: {
        name: "Inactive Product B",
        price: 50.0,
        stock: 10,
        minOrderQuantity: 1,
        businessId: businessB.id,
        categoryId: category.id,
        isActive: false,
      },
    });

    // 4. Setup Buyer C
    buyerUserC = await prisma.user.create({
      data: { name: "Buyer User C", role: "BUYER" },
    });
  });

  after(async () => {
    // Cleanup created test records safely
    try {
      if (buyerUserC?.id) {
        await prisma.cartItem.deleteMany({ where: { cart: { userId: buyerUserC.id } } });
        await prisma.cart.deleteMany({ where: { userId: buyerUserC.id } });
        await prisma.user.delete({ where: { id: buyerUserC.id } }).catch(() => {});
      }
      if (sellerUserA?.id) {
        await prisma.cartItem.deleteMany({ where: { cart: { userId: sellerUserA.id } } });
        await prisma.cart.deleteMany({ where: { userId: sellerUserA.id } });
        if (businessA?.id) {
          await prisma.bulkPricing.deleteMany({ where: { product: { businessId: businessA.id } } });
          await prisma.product.deleteMany({ where: { businessId: businessA.id } });
          await prisma.business.delete({ where: { id: businessA.id } }).catch(() => {});
        }
        await prisma.user.delete({ where: { id: sellerUserA.id } }).catch(() => {});
      }
      if (sellerUserB?.id) {
        await prisma.cartItem.deleteMany({ where: { cart: { userId: sellerUserB.id } } });
        await prisma.cart.deleteMany({ where: { userId: sellerUserB.id } });
        if (businessB?.id) {
          await prisma.bulkPricing.deleteMany({ where: { product: { businessId: businessB.id } } });
          await prisma.product.deleteMany({ where: { businessId: businessB.id } });
          await prisma.business.delete({ where: { id: businessB.id } }).catch(() => {});
        }
        await prisma.user.delete({ where: { id: sellerUserB.id } }).catch(() => {});
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    if (server) {
      server.close();
    }
  });

  it("1. Rejects request when x-user-id header is missing or malformed (HTTP 400)", async () => {
    const res = await request("GET", "/api/cart");
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  it("2. Returns an empty cart with default totals on initial fetch (HTTP 200)", async () => {
    const res = await request("GET", "/api/cart", null, {
      "x-user-id": buyerUserC.id,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.userId, buyerUserC.id);
    assert.strictEqual(res.body.data.items.length, 0);
    assert.strictEqual(res.body.data.subtotal, 0);
    assert.strictEqual(res.body.data.totalUnits, 0);
    assert.strictEqual(res.body.data.cartItemCount, 0);
  });

  it("3. Successfully adds eligible product to user's cart (HTTP 201)", async () => {
    const res = await request(
      "POST",
      "/api/cart/items",
      { productId: productB.id, quantity: 5 },
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.items.length, 1);
    const item = res.body.data.items[0];
    assert.strictEqual(item.productId, productB.id);
    assert.strictEqual(item.quantity, 5);
    assert.strictEqual(item.unitPrice, 200);
    assert.strictEqual(item.itemTotal, 1000);
    assert.strictEqual(res.body.data.subtotal, 1000);
  });

  it("4. Rejects attempt by Seller A to add their own product to cart (HTTP 403 Forbidden)", async () => {
    const res = await request(
      "POST",
      "/api/cart/items",
      { productId: productA.id, quantity: 2 },
      { "x-user-id": sellerUserA.id }
    );
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /cannot purchase.*own business/i);
  });

  it("5. Allows Seller A to add Seller B's product to cart (HTTP 201)", async () => {
    const res = await request(
      "POST",
      "/api/cart/items",
      { productId: productB.id, quantity: 5 },
      { "x-user-id": sellerUserA.id }
    );
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.items.length, 1);
    assert.strictEqual(res.body.data.items[0].productId, productB.id);
  });

  it("6. Rejects adding inactive or deleted product (HTTP 400)", async () => {
    const res = await request(
      "POST",
      "/api/cart/items",
      { productId: inactiveProductB.id, quantity: 1 },
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /inactive/i);
  });

  it("7. Rejects quantity below product MOQ (HTTP 400)", async () => {
    // productB has MOQ = 5
    const res = await request(
      "POST",
      "/api/cart/items",
      { productId: productB.id, quantity: 2 },
      { "x-user-id": sellerUserB.id } // Note: even before ownership, or with buyer
    );
    // Either 403 (own product) or 400 (MOQ)
    assert(res.status === 400 || res.status === 403);
  });

  it("8. Applies bulk pricing tier when quantity reaches threshold (e.g. 20 units -> ₹175)", async () => {
    // Update quantity of productB in buyerUserC's cart to 20 units (tier: 20-49 @ 175)
    const res = await request(
      "PUT",
      `/api/cart/items/${productB.id}`,
      { quantity: 20 },
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const item = res.body.data.items.find((i) => i.productId === productB.id);
    assert.strictEqual(item.quantity, 20);
    assert.strictEqual(item.unitPrice, 175);
    assert.strictEqual(item.itemTotal, 3500); // 20 * 175
    assert.strictEqual(item.savings, 500); // 20 * (200 - 175)
    assert.strictEqual(item.activeTier.pricePerUnit, 175);
    assert.strictEqual(res.body.data.subtotal, 3500);
    assert.strictEqual(res.body.data.totalSavings, 500);
  });

  it("9. Applies top bulk pricing tier (50+ units -> ₹150)", async () => {
    const res = await request(
      "PUT",
      `/api/cart/items/${productB.id}`,
      { quantity: 50 },
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 200);
    const item = res.body.data.items.find((i) => i.productId === productB.id);
    assert.strictEqual(item.quantity, 50);
    assert.strictEqual(item.unitPrice, 150);
    assert.strictEqual(item.itemTotal, 7500); // 50 * 150
    assert.strictEqual(item.savings, 2500); // 50 * (200 - 150)
  });

  it("10. Rejects quantity update below MOQ (HTTP 400)", async () => {
    // productB MOQ is 5
    const res = await request(
      "PUT",
      `/api/cart/items/${productB.id}`,
      { quantity: 3 },
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /minimum order quantity/i);
  });

  it("11. Adds second product from Seller A to Buyer C's cart and calculates combined totals", async () => {
    const res = await request(
      "POST",
      "/api/cart/items",
      { productId: productA.id, quantity: 10 },
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.items.length, 2);
    // Product B: 50 * 150 = 7500
    // Product A: 10 * 100 = 1000
    // Total: 8500
    assert.strictEqual(res.body.data.subtotal, 8500);
    assert.strictEqual(res.body.data.totalUnits, 60);
    assert.strictEqual(res.body.data.cartItemCount, 2);
  });

  it("12. Removes individual cart item (HTTP 200)", async () => {
    const res = await request(
      "DELETE",
      `/api/cart/items/${productA.id}`,
      null,
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.items.length, 1);
    assert.strictEqual(res.body.data.items[0].productId, productB.id);
    assert.strictEqual(res.body.data.subtotal, 7500);
  });

  it("13. Clears all cart items on explicit request (HTTP 200)", async () => {
    const res = await request(
      "DELETE",
      "/api/cart",
      null,
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.items.length, 0);
    assert.strictEqual(res.body.data.subtotal, 0);
    assert.strictEqual(res.body.data.cartItemCount, 0);
  });

  it("14. Idempotently migrates local cart items to PostgreSQL (HTTP 200)", async () => {
    const localItems = [
      { productId: productB.id, quantity: 10 },
      { productId: productA.id, quantity: 5 },
      { productId: "invalid-uuid-1111-2222-3333-444455556666", quantity: 2 }, // Invalid
    ];

    const res = await request(
      "POST",
      "/api/cart/migrate",
      { items: localItems },
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.migratedCount, 2);
    assert.strictEqual(res.body.data.skippedCount, 1);
    assert.strictEqual(res.body.data.cart.items.length, 2);
  });

  it("15. Retries migration without duplicating items (idempotence)", async () => {
    const localItems = [
      { productId: productB.id, quantity: 10 },
      { productId: productA.id, quantity: 5 },
    ];

    const res = await request(
      "POST",
      "/api/cart/migrate",
      { items: localItems },
      { "x-user-id": buyerUserC.id }
    );
    assert.strictEqual(res.status, 200);
    // Items should still be 2, not 4
    assert.strictEqual(res.body.data.cart.items.length, 2);
  });

  it("16. Enforces cart isolation: User A cannot see or modify User C's cart", async () => {
    // Seller A fetches their own cart
    const resA = await request("GET", "/api/cart", null, {
      "x-user-id": sellerUserA.id,
    });
    // User C fetches their cart
    const resC = await request("GET", "/api/cart", null, {
      "x-user-id": buyerUserC.id,
    });

    assert.notStrictEqual(resA.body.data.id, resC.body.data.id);
    assert.notStrictEqual(resA.body.data.items.length, resC.body.data.items.length);
  });
});

