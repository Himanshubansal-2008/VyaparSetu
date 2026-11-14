/**
 * Automated Test Suite: Product Management & Seller APIs
 * Tests:
 * 1. Product creation with business UUID and category UUID
 * 2. Product update with business ownership enforcement (403 for unauthorized)
 * 3. Product deletion/deactivation with business ownership enforcement (403 for unauthorized)
 * 4. GET /api/seller/products returning only the current seller's products
 * 5. GET /api/products?businessId=... filtering
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let server;
let baseUrl;

let userA;
let businessA;
let userB;
let businessB;
let testCategoryId;
let testProductAId;

async function postRequest(path, body = {}, headers = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function putRequest(path, body = {}, headers = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function deleteRequest(path, headers = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function getRequest(path, headers = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe("Product Management and Seller API Tests", () => {
  before(async () => {
    // Start HTTP server on dynamic port
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Ensure a category exists
    const category = await prisma.category.findFirst();
    assert.ok(category, "Database should have at least one seed category");
    testCategoryId = category.id;

    // Create User A and Business A
    const userARes = await postRequest("/api/users/init");
    userA = userARes.data.data;

    const bizARes = await postRequest(
      "/api/businesses",
      {
        name: `Seller A Corp ${Date.now()}`,
        category: "Clothing & Textiles",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        email: `sellerA_${Date.now()}@test.com`,
        phone: `98000${Math.floor(10000 + Math.random() * 90000)}`,
      },
      { "x-user-id": userA.id }
    );
    businessA = bizARes.data.data;

    // Create User B and Business B
    const userBRes = await postRequest("/api/users/init");
    userB = userBRes.data.data;

    const bizBRes = await postRequest(
      "/api/businesses",
      {
        name: `Seller B Enterprises ${Date.now()}`,
        category: "Electronics",
        city: "Delhi",
        state: "Delhi",
        pincode: "110001",
        email: `sellerB_${Date.now()}@test.com`,
        phone: `99000${Math.floor(10000 + Math.random() * 90000)}`,
      },
      { "x-user-id": userB.id }
    );
    businessB = bizBRes.data.data;
  });

  after(async () => {
    // Clean up created test products
    if (testProductAId) {
      await prisma.product.deleteMany({
        where: { id: testProductAId },
      }).catch(() => {});
    }
    await prisma.product.deleteMany({
      where: { businessId: { in: [businessA.id, businessB.id] } },
    }).catch(() => {});
    await prisma.business.deleteMany({
      where: { id: { in: [businessA.id, businessB.id] } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    }).catch(() => {});

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect().catch(() => {});
  });

  it("1. Creates a product via POST /api/products for Business A", async () => {
    const res = await postRequest(
      "/api/products",
      {
        name: "Test Wholesale Cotton Fabric",
        description: "High quality premium cotton bales",
        price: 250,
        stock: 500,
        minOrderQuantity: 10,
        unit: "meter",
        categoryId: testCategoryId,
        businessId: businessA.id,
        bulkPricing: [
          { minQuantity: 10, maxQuantity: 49, pricePerUnit: 250 },
          { minQuantity: 50, maxQuantity: null, pricePerUnit: 220 },
        ],
      },
      { "x-user-id": userA.id, "x-business-id": businessA.id }
    );

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(UUID_REGEX.test(res.data.data.id));
    assert.strictEqual(res.data.data.name, "Test Wholesale Cotton Fabric");
    assert.strictEqual(res.data.data.businessId, businessA.id);
    assert.strictEqual(res.data.data.bulkPricing.length, 2);

    testProductAId = res.data.data.id;
  });

  it("2. Allows Business A to update its own product via PUT /api/products/:id", async () => {
    const res = await putRequest(
      `/api/products/${testProductAId}`,
      {
        name: "Updated Wholesale Cotton Fabric Premium",
        price: 260,
        stock: 450,
      },
      { "x-user-id": userA.id, "x-business-id": businessA.id }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.name, "Updated Wholesale Cotton Fabric Premium");
    assert.strictEqual(Number(res.data.data.price), 260);
    assert.strictEqual(res.data.data.stock, 450);
  });

  it("3. Forbids Business B from updating Business A's product (403 Forbidden)", async () => {
    const res = await putRequest(
      `/api/products/${testProductAId}`,
      {
        name: "Hacked by Seller B",
        price: 10,
      },
      { "x-user-id": userB.id, "x-business-id": businessB.id }
    );

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /permission to modify/i);
  });

  it("4. Forbids Business B from deleting Business A's product (403 Forbidden)", async () => {
    const res = await deleteRequest(
      `/api/products/${testProductAId}`,
      { "x-user-id": userB.id, "x-business-id": businessB.id }
    );

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /permission to delete/i);
  });

  it("5. GET /api/seller/products returns only products belonging to current seller", async () => {
    // First create a product for Business B
    const prodBRes = await postRequest(
      "/api/products",
      {
        name: "Seller B Electric Kettle",
        price: 800,
        stock: 50,
        minOrderQuantity: 5,
        unit: "piece",
        categoryId: testCategoryId,
        businessId: businessB.id,
      },
      { "x-user-id": userB.id, "x-business-id": businessB.id }
    );
    assert.strictEqual(prodBRes.status, 201);

    // Call GET /api/seller/products as Business A
    const resA = await getRequest("/api/seller/products", {
      "x-user-id": userA.id,
      "x-business-id": businessA.id,
    });

    assert.strictEqual(resA.status, 200);
    assert.strictEqual(resA.data.success, true);
    const prodsA = resA.data.data.products;
    assert.ok(Array.isArray(prodsA));
    assert.strictEqual(prodsA.length, 1);
    assert.strictEqual(prodsA[0].id, testProductAId);
    assert.strictEqual(prodsA[0].businessId, businessA.id);

    // Call GET /api/seller/products as Business B
    const resB = await getRequest("/api/seller/products", {
      "x-user-id": userB.id,
      "x-business-id": businessB.id,
    });

    assert.strictEqual(resB.status, 200);
    const prodsB = resB.data.data.products;
    assert.strictEqual(prodsB.length, 1);
    assert.strictEqual(prodsB[0].businessId, businessB.id);
  });

  it("6. GET /api/products?businessId=... filters marketplace products by business", async () => {
    const res = await getRequest(`/api/products?businessId=${businessA.id}`);
    assert.strictEqual(res.status, 200);
    const prods = res.data.data.products;
    assert.ok(prods.every((p) => p.businessId === businessA.id));
  });

  it("7. Allows Business A to delete its own product", async () => {
    const res = await deleteRequest(
      `/api/products/${testProductAId}`,
      { "x-user-id": userA.id, "x-business-id": businessA.id }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    // Verify it is gone from database
    const dbCheck = await prisma.product.findUnique({
      where: { id: testProductAId },
    });
    assert.strictEqual(dbCheck, null);
    testProductAId = null;
  });
});
