require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

let server;
let baseUrl;

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
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
};

describe("Order & Cart Backend Ownership Enforcement Test Suite", () => {
  let userA, businessA, productA;
  let userB, businessB, productB;
  let category;

  before(async () => {
    // Start test server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // Get an existing category
    category = await prisma.category.findFirst({ where: { isActive: true } });
    assert.ok(category, "Seed category should exist");

    // 1. Setup Seller A (User A + Business A + Product A)
    const initResA = await makeRequest("/api/users/init", {
      method: "POST",
      body: { name: "Seller User A", email: `seller.a.${Date.now()}@test.com` },
    });
    userA = initResA.data?.data || initResA.data;
    assert.ok(userA?.id, "User A should be initialized");

    const bizResA = await makeRequest("/api/businesses", {
      method: "POST",
      headers: { "x-user-id": userA.id },
      body: {
        name: `Seller A Business ${Date.now()}`,
        category: "Clothing & Textiles",
        ownerId: userA.id,
      },
    });
    businessA = bizResA.data?.data || bizResA.data;
    assert.ok(businessA?.id, "Business A should be created");

    const prodResA = await makeRequest("/api/products", {
      method: "POST",
      headers: { "x-user-id": userA.id, "x-business-id": businessA.id },
      body: {
        name: `Product Owned By Seller A ${Date.now()}`,
        price: 500,
        stock: 50,
        minOrderQuantity: 5,
        unit: "piece",
        categoryId: category.id,
        businessId: businessA.id,
      },
    });
    productA = prodResA.data?.data || prodResA.data;
    assert.ok(productA?.id, "Product A should be created");

    // 2. Setup Seller B (User B + Business B + Product B)
    const initResB = await makeRequest("/api/users/init", {
      method: "POST",
      body: { name: "Seller User B", email: `seller.b.${Date.now()}@test.com` },
    });
    userB = initResB.data?.data || initResB.data;
    assert.ok(userB?.id, "User B should be initialized");

    const bizResB = await makeRequest("/api/businesses", {
      method: "POST",
      headers: { "x-user-id": userB.id },
      body: {
        name: `Seller B Business ${Date.now()}`,
        category: "Electronics",
        ownerId: userB.id,
      },
    });
    businessB = bizResB.data?.data || bizResB.data;
    assert.ok(businessB?.id, "Business B should be created");

    const prodResB = await makeRequest("/api/products", {
      method: "POST",
      headers: { "x-user-id": userB.id, "x-business-id": businessB.id },
      body: {
        name: `Product Owned By Seller B ${Date.now()}`,
        price: 1200,
        stock: 30,
        minOrderQuantity: 2,
        unit: "piece",
        categoryId: category.id,
        businessId: businessB.id,
      },
    });
    productB = prodResB.data?.data || prodResB.data;
    assert.ok(productB?.id, "Product B should be created");
  });

  after(async () => {
    // Cleanup products and businesses created in test
    if (productA?.id) {
      await prisma.product.deleteMany({ where: { id: productA.id } });
    }
    if (productB?.id) {
      await prisma.product.deleteMany({ where: { id: productB.id } });
    }
    if (businessA?.id) {
      await prisma.business.deleteMany({ where: { id: businessA.id } });
    }
    if (businessB?.id) {
      await prisma.business.deleteMany({ where: { id: businessB.id } });
    }
    if (userA?.id) {
      await prisma.user.deleteMany({ where: { id: userA.id } });
    }
    if (userB?.id) {
      await prisma.user.deleteMany({ where: { id: userB.id } });
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("1. Rejects attempt by Seller A to purchase their own product via POST /api/orders (HTTP 403)", async () => {
    const res = await makeRequest("/api/orders", {
      method: "POST",
      headers: { "x-user-id": userA.id },
      body: {
        items: [
          { productId: productA.id, quantity: 5 },
        ],
        deliveryAddress: { street: "123 Test St", city: "Jaipur", state: "Rajasthan", pincode: "302001" },
      },
    });

    assert.strictEqual(res.status, 403, "Should return HTTP 403 Forbidden");
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Sellers cannot purchase products from their own business/i);
    assert.strictEqual(res.data.details?.code, "OWN_PRODUCT_PURCHASE_FORBIDDEN");
  });

  it("2. Allows Seller A to purchase Seller B's product via POST /api/orders (HTTP 201)", async () => {
    const res = await makeRequest("/api/orders", {
      method: "POST",
      headers: { "x-user-id": userA.id },
      body: {
        items: [
          { productId: productB.id, quantity: 2 },
        ],
        deliveryAddress: { street: "123 Test St", city: "Jaipur", state: "Rajasthan", pincode: "302001" },
      },
    });

    assert.strictEqual(res.status, 201, "Should return HTTP 201 Created");
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data?.id, "Order should have an ID");
    assert.strictEqual(res.data.data.items.length, 1);
    assert.strictEqual(res.data.data.items[0].productId, productB.id);
  });

  it("3. Rejects a mixed order containing both Seller B's product and Seller A's own product (HTTP 403)", async () => {
    const res = await makeRequest("/api/orders", {
      method: "POST",
      headers: { "x-user-id": userA.id },
      body: {
        items: [
          { productId: productB.id, quantity: 2 }, // Other seller's product
          { productId: productA.id, quantity: 5 }, // Own product!
        ],
        deliveryAddress: { street: "123 Test St", city: "Jaipur", state: "Rajasthan", pincode: "302001" },
      },
    });

    assert.strictEqual(res.status, 403, "Should reject mixed order with HTTP 403 Forbidden");
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Product ".*" belongs to your business/i);
  });

  it("4. Prevents client-side spoofing: Seller A supplying Seller B's businessId is still rejected (HTTP 403)", async () => {
    // Seller A tries to spoof x-business-id header as Business B
    const res = await makeRequest("/api/orders", {
      method: "POST",
      headers: {
        "x-user-id": userA.id,
        "x-business-id": businessB.id, // Spoofed!
      },
      body: {
        items: [
          { productId: productA.id, quantity: 5, businessId: businessB.id }, // Spoofed in body!
        ],
      },
    });

    assert.strictEqual(res.status, 403, "Server must verify real database relationship and reject with 403");
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Sellers cannot purchase products from their own business/i);
  });

  it("5. Rejects attempt to add own product to cart via POST /api/cart/validate (HTTP 403)", async () => {
    const res = await makeRequest("/api/cart/validate", {
      method: "POST",
      headers: { "x-user-id": userA.id },
      body: { productId: productA.id },
    });

    assert.strictEqual(res.status, 403, "Should return HTTP 403 Forbidden");
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /You cannot add your own product to your wholesale cart/i);
    assert.strictEqual(res.data.details?.code, "OWN_PRODUCT_CART_FORBIDDEN");
  });

  it("6. Allows adding another seller's product to cart via POST /api/cart/validate (HTTP 200)", async () => {
    const res = await makeRequest("/api/cart/validate", {
      method: "POST",
      headers: { "x-user-id": userA.id },
      body: { productId: productB.id },
    });

    assert.strictEqual(res.status, 200, "Should return HTTP 200 OK");
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data?.eligible, true);
  });

  it("7. Pre-flight order validation endpoint POST /api/orders/validate rejects own products", async () => {
    const res = await makeRequest("/api/orders/validate", {
      method: "POST",
      headers: { "x-user-id": userA.id },
      body: {
        items: [{ productId: productA.id, quantity: 5 }],
      },
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
  });

  it("8. Rejects order request when x-user-id header is missing (HTTP 400)", async () => {
    const res = await makeRequest("/api/orders", {
      method: "POST",
      body: {
        items: [{ productId: productB.id, quantity: 2 }],
      },
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
  });
});
