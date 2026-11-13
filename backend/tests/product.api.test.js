/**
 * Automated Test Suite: Product Create and Update APIs
 * Tests POST /api/products, PUT /api/products/:id, GET /api/products, and database consistency.
 * Uses Node.js native test runner (node:test) and assert (node:assert).
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

let server;
let baseUrl;

async function postRequest(path, body) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function putRequest(path, body) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function patchRequest(path, body) {
  const url = `${baseUrl}${path}`;
  const options = {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function getRequest(path) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe("Product Create & Update API Comprehensive Test Suite", () => {
  const testProductIds = [];
  const testCategoryIds = [];
  const testBusinessIds = [];
  const testUserIds = [];

  let categoryAlpha;
  let categoryBeta;
  let businessAlpha;
  let businessBeta;

  before(async () => {
    // Start HTTP server on dynamic port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // Setup isolated test Category Alpha & Beta
    categoryAlpha = await prisma.category.create({
      data: {
        name: `Automated Test Category Alpha ${timestamp}`,
        description: "Primary testing category",
        isActive: true,
      },
    });
    testCategoryIds.push(categoryAlpha.id);

    categoryBeta = await prisma.category.create({
      data: {
        name: `Automated Test Category Beta ${timestamp}`,
        description: "Secondary testing category",
        isActive: true,
      },
    });
    testCategoryIds.push(categoryBeta.id);

    // Setup isolated test User & Business Alpha
    const userAlpha = await prisma.user.create({
      data: {
        email: `auto_seller_alpha_${timestamp}@example.com`,
        phone: `98000${String(timestamp).slice(-5)}1`,
        passwordHash: "secure_pass_hash_alpha_not_exposed",
        name: "Alpha Test Merchant",
      },
    });
    testUserIds.push(userAlpha.id);

    businessAlpha = await prisma.business.create({
      data: {
        name: `Alpha Enterprises ${timestamp}`,
        description: "Alpha wholesale supplier",
        category: "Industrial",
        address: "100 Innovation Way",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560100",
        phone: "+91-9800011111",
        email: "alpha@example.com",
        ownerId: userAlpha.id,
      },
    });
    testBusinessIds.push(businessAlpha.id);

    // Setup isolated test User & Business Beta
    const userBeta = await prisma.user.create({
      data: {
        email: `auto_seller_beta_${timestamp}@example.com`,
        phone: `98000${String(timestamp).slice(-5)}2`,
        passwordHash: "secure_pass_hash_beta_not_exposed",
        name: "Beta Test Merchant",
      },
    });
    testUserIds.push(userBeta.id);

    businessBeta = await prisma.business.create({
      data: {
        name: `Beta Enterprises ${timestamp}`,
        description: "Beta wholesale supplier",
        category: "Textiles",
        address: "200 Trade Road",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        phone: "+91-9800022222",
        email: "beta@example.com",
        ownerId: userBeta.id,
      },
    });
    testBusinessIds.push(businessBeta.id);
  });

  after(async () => {
    // Clean up only test records
    if (testProductIds.length > 0) {
      await prisma.product.deleteMany({
        where: { id: { in: testProductIds } },
      });
    }
    if (testBusinessIds.length > 0) {
      await prisma.business.deleteMany({
        where: { id: { in: testBusinessIds } },
      });
    }
    if (testUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: testUserIds } },
      });
    }
    if (testCategoryIds.length > 0) {
      await prisma.category.deleteMany({
        where: { id: { in: testCategoryIds } },
      });
    }

    await prisma.$disconnect();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ========================================================
  // SECTION 1: POST /api/products - Product Creation API
  // ========================================================
  describe("POST /api/products - Product Creation API", () => {
    it("should successfully create a product with all valid fields", async () => {
      const payload = {
        name: `Heavy Duty Drill ${Date.now()}`,
        description: "High performance brushless rotary drill",
        price: 349.99,
        stock: 120,
        minOrderQuantity: 5,
        unit: "piece",
        imageUrl: "https://example.com/drill.jpg",
        isActive: true,
        isFeatured: true,
        isSurplus: true,
        surplusQuantity: 20,
        surplusPrice: 289.99,
        surplusDeadline: new Date(Date.now() + 864000000).toISOString(),
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      };

      const res = await postRequest("/api/products", payload);
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.message, "Product created successfully");
      const prod = res.data.data;
      testProductIds.push(prod.id);

      assert.strictEqual(prod.name, payload.name);
      assert.strictEqual(prod.description, payload.description);
      assert.strictEqual(Number(prod.price), 349.99);
      assert.strictEqual(prod.stock, 120);
      assert.strictEqual(prod.minOrderQuantity, 5);
      assert.strictEqual(prod.unit, "piece");
      assert.strictEqual(prod.imageUrl, payload.imageUrl);
      assert.strictEqual(prod.isActive, true);
      assert.strictEqual(prod.isFeatured, true);
      assert.strictEqual(prod.isSurplus, true);
      assert.strictEqual(prod.surplusQuantity, 20);
      assert.strictEqual(Number(prod.surplusPrice), 289.99);
      assert.strictEqual(prod.category.id, categoryAlpha.id);
      assert.strictEqual(prod.business.id, businessAlpha.id);
    });

    it("should successfully create a product with optional fields omitted and verify defaults", async () => {
      const payload = {
        name: `Minimal Tool ${Date.now()}`,
        price: 85.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      };

      const res = await postRequest("/api/products", payload);
      assert.strictEqual(res.status, 201);
      const prod = res.data.data;
      testProductIds.push(prod.id);

      assert.strictEqual(prod.name, payload.name);
      assert.strictEqual(Number(prod.price), 85.0);
      assert.strictEqual(prod.stock, 0); // default
      assert.strictEqual(prod.minOrderQuantity, 1); // default
      assert.strictEqual(prod.unit, "piece"); // default
      assert.strictEqual(prod.imageUrl, null); // default
      assert.strictEqual(prod.description, null); // default
      assert.strictEqual(prod.isActive, true); // default
      assert.strictEqual(prod.isFeatured, false); // default
      assert.strictEqual(prod.isSurplus, false); // default
      assert.strictEqual(prod.surplusQuantity, 0); // default
      assert.strictEqual(prod.surplusPrice, null); // default
      assert.deepStrictEqual(prod.bulkPricing, []); // default
    });

    it("should successfully create a product with valid BulkPricing tiers sorted ascending", async () => {
      const payload = {
        name: `Bulk Discount Cable ${Date.now()}`,
        price: 15.0,
        stock: 2000,
        minOrderQuantity: 50,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        bulkPricing: [
          { minQuantity: 200, maxQuantity: 499, pricePerUnit: 12.0 },
          { minQuantity: 50, maxQuantity: 199, pricePerUnit: 13.5 },
          { minQuantity: 500, maxQuantity: null, pricePerUnit: 10.0 },
        ],
      };

      const res = await postRequest("/api/products", payload);
      assert.strictEqual(res.status, 201);
      const prod = res.data.data;
      testProductIds.push(prod.id);

      assert.strictEqual(prod.bulkPricing.length, 3);
      assert.strictEqual(prod.bulkPricing[0].minQuantity, 50);
      assert.strictEqual(prod.bulkPricing[0].maxQuantity, 199);
      assert.strictEqual(Number(prod.bulkPricing[0].pricePerUnit), 13.5);

      assert.strictEqual(prod.bulkPricing[1].minQuantity, 200);
      assert.strictEqual(prod.bulkPricing[1].maxQuantity, 499);
      assert.strictEqual(Number(prod.bulkPricing[1].pricePerUnit), 12.0);

      assert.strictEqual(prod.bulkPricing[2].minQuantity, 500);
      assert.strictEqual(prod.bulkPricing[2].maxQuantity, null);
      assert.strictEqual(Number(prod.bulkPricing[2].pricePerUnit), 10.0);
    });

    it("should reject creation when product name is missing or empty", async () => {
      const res1 = await postRequest("/api/products", {
        price: 50,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(res1.status, 400);
      assert(res1.data.errors.some((e) => e.field === "name"));

      const res2 = await postRequest("/api/products", {
        name: "    ",
        price: 50,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(res2.status, 400);
      assert(res2.data.errors.some((e) => e.field === "name"));
    });

    it("should reject creation when price is missing, zero, or negative", async () => {
      const resMissing = await postRequest("/api/products", {
        name: "Test Price Missing",
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resMissing.status, 400);

      const resZero = await postRequest("/api/products", {
        name: "Test Price Zero",
        price: 0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resZero.status, 400);

      const resNegative = await postRequest("/api/products", {
        name: "Test Price Negative",
        price: -25,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resNegative.status, 400);
    });

    it("should reject creation when stock is negative", async () => {
      const res = await postRequest("/api/products", {
        name: "Test Negative Stock",
        price: 25,
        stock: -10,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(res.status, 400);
      assert(res.data.errors.some((e) => e.field === "stock"));
    });

    it("should reject creation when MOQ is zero or negative", async () => {
      const resZero = await postRequest("/api/products", {
        name: "Test MOQ Zero",
        price: 25,
        minOrderQuantity: 0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resZero.status, 400);

      const resNeg = await postRequest("/api/products", {
        name: "Test MOQ Negative",
        price: 25,
        minOrderQuantity: -1,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resNeg.status, 400);
    });

    it("should reject creation when unit is empty string", async () => {
      const res = await postRequest("/api/products", {
        name: "Test Empty Unit",
        price: 25,
        unit: "   ",
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(res.status, 400);
      assert(res.data.errors.some((e) => e.field === "unit"));
    });

    it("should reject creation when imageUrl is invalid URL", async () => {
      const res = await postRequest("/api/products", {
        name: "Test Bad Image",
        price: 25,
        imageUrl: "ftp://not-http-url.com/image.png",
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(res.status, 400);
      assert(res.data.errors.some((e) => e.field === "imageUrl"));
    });

    it("should reject creation when Category ID is malformed or does not exist", async () => {
      const resBadFormat = await postRequest("/api/products", {
        name: "Test Bad Cat Format",
        price: 25,
        categoryId: "not-a-valid-uuid",
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resBadFormat.status, 400);

      const resNotFound = await postRequest("/api/products", {
        name: "Test Cat Not Found",
        price: 25,
        categoryId: "00000000-0000-0000-0000-000000000000",
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resNotFound.status, 404);
      assert.strictEqual(resNotFound.data.message, "Category not found");
    });

    it("should reject creation when Business ID is malformed or does not exist", async () => {
      const resBadFormat = await postRequest("/api/products", {
        name: "Test Bad Biz Format",
        price: 25,
        categoryId: categoryAlpha.id,
        businessId: "not-a-valid-uuid",
      });
      assert.strictEqual(resBadFormat.status, 400);

      const resNotFound = await postRequest("/api/products", {
        name: "Test Biz Not Found",
        price: 25,
        categoryId: categoryAlpha.id,
        businessId: "00000000-0000-0000-0000-000000000000",
      });
      assert.strictEqual(resNotFound.status, 404);
      assert.strictEqual(resNotFound.data.message, "Business not found");
    });

    it("should reject creation with invalid surplus values (surplusPrice >= price or surplusQuantity > stock)", async () => {
      const resPrice = await postRequest("/api/products", {
        name: "Test Surplus Price",
        price: 50.0,
        stock: 100,
        isSurplus: true,
        surplusQuantity: 10,
        surplusPrice: 60.0, // greater than price
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resPrice.status, 400);

      const resQty = await postRequest("/api/products", {
        name: "Test Surplus Qty",
        price: 50.0,
        stock: 10,
        isSurplus: true,
        surplusQuantity: 25, // greater than stock
        surplusPrice: 40.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resQty.status, 400);
    });

    it("should reject creation with invalid or overlapping BulkPricing tiers", async () => {
      const resOverlap = await postRequest("/api/products", {
        name: "Test Overlapping Tiers",
        price: 50.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        bulkPricing: [
          { minQuantity: 10, maxQuantity: 50, pricePerUnit: 45.0 },
          { minQuantity: 40, maxQuantity: 100, pricePerUnit: 40.0 }, // overlap with 10-50
        ],
      });
      assert.strictEqual(resOverlap.status, 400);

      const resMaxLessThanMin = await postRequest("/api/products", {
        name: "Test Inverted Tiers",
        price: 50.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        bulkPricing: [{ minQuantity: 50, maxQuantity: 20, pricePerUnit: 40.0 }],
      });
      assert.strictEqual(resMaxLessThanMin.status, 400);
    });

    it("should reject creation when unknown or restricted fields are supplied", async () => {
      const resRestricted = await postRequest("/api/products", {
        id: "11111111-1111-1111-1111-111111111111",
        name: "Test Injected ID",
        price: 50.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      assert.strictEqual(resRestricted.status, 400);

      const resUnknown = await postRequest("/api/products", {
        name: "Test Unknown Field",
        price: 50.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        unauthorizedField: "hacker_payload",
      });
      assert.strictEqual(resUnknown.status, 400);
    });
  });

  // ========================================================
  // SECTION 2: PUT /api/products/:id - Product Update API
  // ========================================================
  describe("PUT /api/products/:id - Product Update API", () => {
    let updateTargetId;

    before(async () => {
      // Create a baseline product for update testing
      const res = await postRequest("/api/products", {
        name: `Baseline Update Product ${Date.now()}`,
        description: "Initial baseline description",
        price: 200.0,
        stock: 300,
        minOrderQuantity: 10,
        unit: "piece",
        imageUrl: "https://example.com/initial.jpg",
        isActive: true,
        isFeatured: false,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        bulkPricing: [
          { minQuantity: 10, maxQuantity: 49, pricePerUnit: 190.0 },
          { minQuantity: 50, maxQuantity: null, pricePerUnit: 180.0 },
        ],
      });
      assert.strictEqual(res.status, 201);
      updateTargetId = res.data.data.id;
      testProductIds.push(updateTargetId);
    });

    it("should update product name while preserving omitted fields", async () => {
      const newName = `Updated Name ${Date.now()}`;
      const res = await putRequest(`/api/products/${updateTargetId}`, { name: newName });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.name, newName);
      assert.strictEqual(Number(res.data.data.price), 200.0); // preserved
      assert.strictEqual(res.data.data.stock, 300); // preserved
    });

    it("should update description", async () => {
      const newDesc = "Updated description with new details";
      const res = await putRequest(`/api/products/${updateTargetId}`, { description: newDesc });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.description, newDesc);
    });

    it("should update price and preserve Decimal precision", async () => {
      const res = await putRequest(`/api/products/${updateTargetId}`, { price: 220.5 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Number(res.data.data.price), 220.5);
    });

    it("should update stock, MOQ, and unit", async () => {
      const res = await putRequest(`/api/products/${updateTargetId}`, {
        stock: 450,
        minOrderQuantity: 25,
        unit: "box",
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.stock, 450);
      assert.strictEqual(res.data.data.minOrderQuantity, 25);
      assert.strictEqual(res.data.data.unit, "box");
    });

    it("should update image URL and allow clearing to null", async () => {
      const res1 = await putRequest(`/api/products/${updateTargetId}`, {
        imageUrl: "https://example.com/brand-new.png",
      });
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.data.data.imageUrl, "https://example.com/brand-new.png");

      const res2 = await putRequest(`/api/products/${updateTargetId}`, { imageUrl: null });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.data.data.imageUrl, null);
    });

    it("should update active and featured status flags", async () => {
      const res = await putRequest(`/api/products/${updateTargetId}`, {
        isActive: false,
        isFeatured: true,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.isActive, false);
      assert.strictEqual(res.data.data.isFeatured, true);

      // Reset isActive to true
      await putRequest(`/api/products/${updateTargetId}`, { isActive: true });
    });

    it("should update surplus information", async () => {
      const res = await putRequest(`/api/products/${updateTargetId}`, {
        isSurplus: true,
        surplusQuantity: 50,
        surplusPrice: 195.0,
        surplusDeadline: new Date(Date.now() + 864000000).toISOString(),
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.isSurplus, true);
      assert.strictEqual(res.data.data.surplusQuantity, 50);
      assert.strictEqual(Number(res.data.data.surplusPrice), 195.0);
    });

    it("should update Category and Business references", async () => {
      const res = await putRequest(`/api/products/${updateTargetId}`, {
        categoryId: categoryBeta.id,
        businessId: businessBeta.id,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.category.id, categoryBeta.id);
      assert.strictEqual(res.data.data.business.id, businessBeta.id);
    });

    it("should replace existing BulkPricing tiers", async () => {
      const res = await putRequest(`/api/products/${updateTargetId}`, {
        bulkPricing: [
          { minQuantity: 50, maxQuantity: 99, pricePerUnit: 210.0 },
          { minQuantity: 100, maxQuantity: null, pricePerUnit: 190.0 },
        ],
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.bulkPricing.length, 2);
      assert.strictEqual(res.data.data.bulkPricing[0].minQuantity, 50);
      assert.strictEqual(res.data.data.bulkPricing[1].minQuantity, 100);
    });

    it("should remove all BulkPricing tiers using an empty array", async () => {
      const res = await putRequest(`/api/products/${updateTargetId}`, {
        bulkPricing: [],
      });
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.data.data.bulkPricing, []);

      // Verify in DB directly
      const count = await prisma.bulkPricing.count({ where: { productId: updateTargetId } });
      assert.strictEqual(count, 0);
    });

    it("should preserve existing BulkPricing tiers when bulkPricing field is omitted", async () => {
      // Add a tier first
      await putRequest(`/api/products/${updateTargetId}`, {
        bulkPricing: [{ minQuantity: 20, maxQuantity: 50, pricePerUnit: 200.0 }],
      });

      // Update name only
      const res = await putRequest(`/api/products/${updateTargetId}`, {
        name: `Preserved Tiers Name ${Date.now()}`,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.bulkPricing.length, 1);
      assert.strictEqual(res.data.data.bulkPricing[0].minQuantity, 20);
    });

    it("should verify updatedAt timestamp is updated correctly", async () => {
      const before = await prisma.product.findUnique({ where: { id: updateTargetId } });
      // Small pause to guarantee timestamp tick
      await new Promise((r) => setTimeout(r, 10));

      await putRequest(`/api/products/${updateTargetId}`, { stock: 555 });
      const after = await prisma.product.findUnique({ where: { id: updateTargetId } });

      assert(new Date(after.updatedAt).getTime() >= new Date(before.updatedAt).getTime());
    });

    it("should reject update when Product ID is invalid format", async () => {
      const res = await putRequest("/api/products/bad-uuid", { name: "New Name" });
      assert.strictEqual(res.status, 400);
    });

    it("should reject update when Product ID does not exist", async () => {
      const res = await putRequest("/api/products/00000000-0000-0000-0000-000000000000", {
        name: "New Name",
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.message, "Product not found");
    });

    it("should reject empty update body", async () => {
      const res = await putRequest(`/api/products/${updateTargetId}`, {});
      assert.strictEqual(res.status, 400);
    });

    it("should reject update with invalid price, stock, or MOQ", async () => {
      const resPrice = await putRequest(`/api/products/${updateTargetId}`, { price: -10 });
      assert.strictEqual(resPrice.status, 400);

      const resStock = await putRequest(`/api/products/${updateTargetId}`, { stock: -5 });
      assert.strictEqual(resStock.status, 400);

      const resMOQ = await putRequest(`/api/products/${updateTargetId}`, { minOrderQuantity: 0 });
      assert.strictEqual(resMOQ.status, 400);
    });

    it("should reject update with non-existing Category or Business", async () => {
      const resCat = await putRequest(`/api/products/${updateTargetId}`, {
        categoryId: "00000000-0000-0000-0000-000000000000",
      });
      assert.strictEqual(resCat.status, 404);

      const resBiz = await putRequest(`/api/products/${updateTargetId}`, {
        businessId: "00000000-0000-0000-0000-000000000000",
      });
      assert.strictEqual(resBiz.status, 404);
    });

    it("should reject update attempting to modify restricted fields", async () => {
      const resId = await putRequest(`/api/products/${updateTargetId}`, {
        id: "22222222-2222-2222-2222-222222222222",
      });
      assert.strictEqual(resId.status, 400);

      const resCreatedAt = await putRequest(`/api/products/${updateTargetId}`, {
        createdAt: new Date().toISOString(),
      });
      assert.strictEqual(resCreatedAt.status, 400);
    });
  });

  // ========================================================
  // SECTION 3: Database Consistency & Transaction Atomicity
  // ========================================================
  describe("Database Consistency & Transaction Atomicity", () => {
    it("should guarantee transactional atomicity when BulkPricing update fails", async () => {
      // 1. Create a product with known state
      const createRes = await postRequest("/api/products", {
        name: "Atomicity Verification Item",
        price: 100.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        bulkPricing: [{ minQuantity: 10, maxQuantity: 20, pricePerUnit: 90.0 }],
      });
      const prodId = createRes.data.data.id;
      testProductIds.push(prodId);

      // 2. Attempt update with an invalid tier range
      const failRes = await putRequest(`/api/products/${prodId}`, {
        name: "This Updated Name Must NOT Persist",
        bulkPricing: [{ minQuantity: 10, maxQuantity: 5, pricePerUnit: 80.0 }], // max < min
      });
      assert.strictEqual(failRes.status, 400);

      // 3. Inspect PostgreSQL directly
      const current = await prisma.product.findUnique({
        where: { id: prodId },
        include: { bulkPricing: true },
      });

      assert.strictEqual(current.name, "Atomicity Verification Item");
      assert.strictEqual(current.bulkPricing.length, 1);
      assert.strictEqual(current.bulkPricing[0].minQuantity, 10);
    });

    it("should verify foreign keys and relationships are strictly valid in PostgreSQL", async () => {
      const createRes = await postRequest("/api/products", {
        name: "Foreign Key Integrity Item",
        price: 150.0,
        categoryId: categoryBeta.id,
        businessId: businessBeta.id,
      });
      const prodId = createRes.data.data.id;
      testProductIds.push(prodId);

      const dbRecord = await prisma.product.findUnique({
        where: { id: prodId },
        include: { category: true, business: true },
      });

      assert.strictEqual(dbRecord.categoryId, categoryBeta.id);
      assert.strictEqual(dbRecord.category.name, categoryBeta.name);
      assert.strictEqual(dbRecord.businessId, businessBeta.id);
      assert.strictEqual(dbRecord.business.name, businessBeta.name);
    });
  });

  // ========================================================
  // SECTION 4: Verify Related Product APIs (GET Products)
  // ========================================================
  describe("Verify Related Product APIs (GET /api/products & GET /api/products/:id)", () => {
    let getTestProductId;

    before(async () => {
      const res = await postRequest("/api/products", {
        name: "Searchable Unique Drill Motor",
        price: 300.0,
        isFeatured: true,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        bulkPricing: [{ minQuantity: 10, maxQuantity: null, pricePerUnit: 270.0 }],
      });
      getTestProductId = res.data.data.id;
      testProductIds.push(getTestProductId);
    });

    it("should fetch all products with pagination", async () => {
      const res = await getRequest("/api/products?page=1&limit=5");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert(Array.isArray(res.data.data.products));
      assert(res.data.data.pagination);
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 5);
    });

    it("should search products by complete product name", async () => {
      const res = await getRequest("/api/products?search=Searchable%20Unique%20Drill%20Motor");
      assert.strictEqual(res.status, 200);
      const matches = res.data.data.products;
      assert(matches.length > 0);
      assert(matches.some((p) => p.id === getTestProductId));
    });

    it("should search products by partial product name", async () => {
      const res = await getRequest("/api/products?search=Drill%20Motor");
      assert.strictEqual(res.status, 200);
      const matches = res.data.data.products;
      assert(matches.length > 0);
      assert(matches.some((p) => p.id === getTestProductId));
    });

    it("should search products with different letter casing (case-insensitive)", async () => {
      const res = await getRequest("/api/products?search=sEaRcHaBLe%20uNiQuE");
      assert.strictEqual(res.status, 200);
      const matches = res.data.data.products;
      assert(matches.length > 0);
      assert(matches.some((p) => p.id === getTestProductId));
    });

    it("should search products with leading and trailing whitespace", async () => {
      const res = await getRequest("/api/products?search=%20%20%20Unique%20Drill%20%20%20");
      assert.strictEqual(res.status, 200);
      const matches = res.data.data.products;
      assert(matches.length > 0);
      assert(matches.some((p) => p.id === getTestProductId));
    });

    it("should return empty list when no products match the search query", async () => {
      const res = await getRequest("/api/products?search=UnmatchedNonExistingXYZ987654321");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.products.length, 0);
      assert.strictEqual(res.data.data.pagination.totalProducts, 0);
    });

    it("should never return inactive products in search results", async () => {
      // Create an inactive product matching the keyword
      const inactRes = await postRequest("/api/products", {
        name: "Searchable Inactive Drill Motor",
        price: 280.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      const inactProdId = inactRes.data.data.id;
      testProductIds.push(inactProdId);
      await patchRequest(`/api/products/${inactProdId}/deactivate`);

      // Search for the inactive product's name
      const res = await getRequest("/api/products?search=Searchable%20Inactive");
      assert.strictEqual(res.status, 200);
      const matches = res.data.data.products;
      assert(!matches.some((p) => p.id === inactProdId));
    });

    it("should preserve all relationships in product search results", async () => {
      const res = await getRequest("/api/products?search=Searchable%20Unique%20Drill%20Motor");
      assert.strictEqual(res.status, 200);
      const prod = res.data.data.products.find((p) => p.id === getTestProductId);
      assert(prod, "Matched product must be present");

      // Verify category
      assert(prod.category);
      assert.strictEqual(prod.category.id, categoryAlpha.id);
      assert.strictEqual(typeof prod.category.name, "string");

      // Verify business
      assert(prod.business);
      assert.strictEqual(prod.business.id, businessAlpha.id);
      assert.strictEqual(prod.business.owner, undefined);
      assert.strictEqual(prod.business.passwordHash, undefined);

      // Verify bulk pricing
      assert(Array.isArray(prod.bulkPricing));
      assert.strictEqual(prod.bulkPricing.length, 1);
      assert.strictEqual(prod.bulkPricing[0].minQuantity, 10);
    });

    it("should accept valid search query parameters (?search=mobile)", async () => {
      const res = await getRequest("/api/products?search=mobile");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert(Array.isArray(res.data.data.products));
    });

    it("should accept valid search query parameters (?search=smartphone)", async () => {
      const res = await getRequest("/api/products?search=smartphone");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert(Array.isArray(res.data.data.products));
    });

    it("should treat empty search query (?search=) as no search and return products", async () => {
      const res = await getRequest("/api/products?search=");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert(Array.isArray(res.data.data.products));
      assert(res.data.data.products.length > 0);
    });

    it("should treat whitespace-only search query (?search=   ) as no search", async () => {
      const res = await getRequest("/api/products?search=%20%20%20");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert(Array.isArray(res.data.data.products));
      assert(res.data.data.products.length > 0);
    });

    it("should trim leading and trailing whitespace from search parameter", async () => {
      const res = await getRequest("/api/products?search=%20%20Searchable%20Unique%20Drill%20%20");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const matches = res.data.data.products;
      assert(matches.some((p) => p.id === getTestProductId));
    });

    it("should reject search query longer than 100 characters with HTTP 400", async () => {
      const longQuery = "a".repeat(101);
      const res = await getRequest(`/api/products?search=${longQuery}`);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Search query cannot exceed 100 characters");
    });

    it("should reject multiple search values with HTTP 400", async () => {
      const res = await getRequest("/api/products?search=drill&search=hammer");
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Multiple search values are not allowed");
    });

    it("should filter products by categoryId and isFeatured", async () => {
      const res = await getRequest(
        `/api/products?categoryId=${categoryAlpha.id}&isFeatured=true`
      );
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.every((p) => p.category.id === categoryAlpha.id));
      assert(prods.every((p) => p.isFeatured === true));
    });

    it("should fetch products using a valid categoryId", async () => {
      const res = await getRequest(`/api/products?categoryId=${categoryAlpha.id}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert(res.data.data.products.length > 0);
      assert(res.data.data.products.every((p) => p.category.id === categoryAlpha.id));
    });

    it("should fetch products across categories when categoryId is omitted", async () => {
      const res = await getRequest("/api/products");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert(res.data.data.products.length > 0);
    });

    it("should combine categoryId with search and exclude other categories", async () => {
      // Create another product with the same keyword in categoryBeta
      const betaProdRes = await postRequest("/api/products", {
        name: "Searchable Unique Drill Motor Beta",
        price: 320.0,
        categoryId: categoryBeta.id,
        businessId: businessBeta.id,
      });
      const betaProdId = betaProdRes.data.data.id;
      testProductIds.push(betaProdId);

      // Search with categoryAlpha filter: should match only getTestProductId and NOT betaProdId
      const resAlpha = await getRequest(
        `/api/products?search=Searchable%20Unique%20Drill&categoryId=${categoryAlpha.id}`
      );
      assert.strictEqual(resAlpha.status, 200);
      const prodsAlpha = resAlpha.data.data.products;
      assert(prodsAlpha.some((p) => p.id === getTestProductId));
      assert(!prodsAlpha.some((p) => p.id === betaProdId));
      assert(prodsAlpha.every((p) => p.category.id === categoryAlpha.id));

      // Search with categoryBeta filter: should match only betaProdId and NOT getTestProductId
      const resBeta = await getRequest(
        `/api/products?search=Searchable%20Unique%20Drill&categoryId=${categoryBeta.id}`
      );
      assert.strictEqual(resBeta.status, 200);
      const prodsBeta = resBeta.data.data.products;
      assert(prodsBeta.some((p) => p.id === betaProdId));
      assert(!prodsBeta.some((p) => p.id === getTestProductId));
      assert(prodsBeta.every((p) => p.category.id === categoryBeta.id));
    });

    it("should exclude inactive products when filtering by categoryId", async () => {
      const inactRes = await postRequest("/api/products", {
        name: `Inactive CatProd ${Date.now()}`,
        price: 99.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      const inactId = inactRes.data.data.id;
      testProductIds.push(inactId);
      await patchRequest(`/api/products/${inactId}/deactivate`);

      const res = await getRequest(`/api/products?categoryId=${categoryAlpha.id}`);
      assert.strictEqual(res.status, 200);
      assert(!res.data.data.products.some((p) => p.id === inactId));
    });

    it("should return empty product list for valid but nonexistent categoryId", async () => {
      const res = await getRequest(
        "/api/products?categoryId=00000000-0000-0000-0000-000000000000"
      );
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.products.length, 0);
      assert.strictEqual(res.data.data.pagination.totalProducts, 0);
    });

    it("should reject malformed categoryId with HTTP 400", async () => {
      const resBadUuid = await getRequest("/api/products?categoryId=not-a-valid-uuid");
      assert.strictEqual(resBadUuid.status, 400);
      assert.strictEqual(resBadUuid.data.success, false);
      assert.strictEqual(resBadUuid.data.message, "Invalid category ID format");

      const resEmpty = await getRequest("/api/products?categoryId=");
      assert.strictEqual(resEmpty.status, 400);
      assert.strictEqual(resEmpty.data.success, false);
      assert.strictEqual(resEmpty.data.message, "Invalid category ID format");

      const resWhitespace = await getRequest("/api/products?categoryId=%20%20%20");
      assert.strictEqual(resWhitespace.status, 400);
      assert.strictEqual(resWhitespace.data.success, false);
      assert.strictEqual(resWhitespace.data.message, "Invalid category ID format");
    });

    it("should reject multiple categoryId values with HTTP 400", async () => {
      const res = await getRequest(
        `/api/products?categoryId=${categoryAlpha.id}&categoryId=${categoryBeta.id}`
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Multiple category IDs are not allowed");
    });

    // --- Price Sorting Test Suite ---
    it("should sort products by price in ascending order (lowest price first)", async () => {
      const res = await getRequest("/api/products?sortBy=price&sortOrder=asc&limit=20");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const prods = res.data.data.products;
      assert(prods.length >= 2, "Need at least 2 products to verify sort order");
      for (let i = 0; i < prods.length - 1; i++) {
        const curr = Number(prods[i].price);
        const next = Number(prods[i + 1].price);
        assert(curr <= next, `Expected ascending price sort but ${curr} > ${next}`);
      }
    });

    it("should sort products by price in descending order (highest price first)", async () => {
      const res = await getRequest("/api/products?sortBy=price&sortOrder=desc&limit=20");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const prods = res.data.data.products;
      assert(prods.length >= 2, "Need at least 2 products to verify sort order");
      for (let i = 0; i < prods.length - 1; i++) {
        const curr = Number(prods[i].price);
        const next = Number(prods[i + 1].price);
        assert(curr >= next, `Expected descending price sort but ${curr} < ${next}`);
      }
    });

    it("should default sortOrder to asc when sortBy=price without sortOrder", async () => {
      const res = await getRequest("/api/products?sortBy=price&limit=20");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const prods = res.data.data.products;
      assert(prods.length >= 2);
      for (let i = 0; i < prods.length - 1; i++) {
        const curr = Number(prods[i].price);
        const next = Number(prods[i + 1].price);
        assert(curr <= next, `Expected ascending price sort by default but ${curr} > ${next}`);
      }
    });

    it("should reject invalid sortBy with HTTP 400", async () => {
      const res = await getRequest("/api/products?sortBy=invalidField");
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Unsupported sortBy field. Only 'price' is supported.");
    });

    it("should reject invalid sortOrder with HTTP 400", async () => {
      const res = await getRequest("/api/products?sortBy=price&sortOrder=diagonal");
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Unsupported sortOrder direction. Only 'asc' and 'desc' are supported.");
    });

    it("should reject sortOrder without sortBy with HTTP 400", async () => {
      const res = await getRequest("/api/products?sortOrder=asc");
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "sortOrder cannot be provided without sortBy");
    });

    it("should reject multiple sortBy or sortOrder values with HTTP 400", async () => {
      const resSortBy = await getRequest("/api/products?sortBy=price&sortBy=price");
      assert.strictEqual(resSortBy.status, 400);
      assert.strictEqual(resSortBy.data.success, false);
      assert.strictEqual(resSortBy.data.message, "Multiple sortBy values are not allowed");

      const resSortOrder = await getRequest("/api/products?sortBy=price&sortOrder=asc&sortOrder=desc");
      assert.strictEqual(resSortOrder.status, 400);
      assert.strictEqual(resSortOrder.data.success, false);
      assert.strictEqual(resSortOrder.data.message, "Multiple sortOrder values are not allowed");
    });

    it("should combine search and price sorting", async () => {
      const res = await getRequest("/api/products?search=Unique%20Drill&sortBy=price&sortOrder=asc");
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.length > 0);
      assert(prods.every((p) => p.name.toLowerCase().includes("drill")));
      for (let i = 0; i < prods.length - 1; i++) {
        assert(Number(prods[i].price) <= Number(prods[i + 1].price));
      }
    });

    it("should combine category filtering and price sorting", async () => {
      const res = await getRequest(`/api/products?categoryId=${categoryAlpha.id}&sortBy=price&sortOrder=desc`);
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.length > 0);
      assert(prods.every((p) => p.category.id === categoryAlpha.id));
      for (let i = 0; i < prods.length - 1; i++) {
        assert(Number(prods[i].price) >= Number(prods[i + 1].price));
      }
    });

    it("should combine search, category filtering, and price sorting", async () => {
      const res = await getRequest(
        `/api/products?search=Unique%20Drill&categoryId=${categoryAlpha.id}&sortBy=price&sortOrder=asc`
      );
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.length > 0);
      assert(prods.every((p) => p.category.id === categoryAlpha.id));
      assert(prods.every((p) => p.name.toLowerCase().includes("drill")));
      for (let i = 0; i < prods.length - 1; i++) {
        assert(Number(prods[i].price) <= Number(prods[i + 1].price));
      }
    });

    it("should preserve default ordering (createdAt: desc) when sorting parameters are omitted", async () => {
      const res = await getRequest("/api/products?limit=20");
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.length >= 2);
      for (let i = 0; i < prods.length - 1; i++) {
        const currTime = new Date(prods[i].createdAt).getTime();
        const nextTime = new Date(prods[i + 1].createdAt).getTime();
        assert(currTime >= nextTime, `Expected newest first createdAt ordering but ${currTime} < ${nextTime}`);
      }
    });

    // --- Pagination Test Suite ---
    it("should return default pagination (page=1, limit=10) with metadata", async () => {
      const res = await getRequest("/api/products");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const meta = res.data.data.pagination;
      assert.strictEqual(meta.page, 1);
      assert.strictEqual(meta.limit, 10);
      assert(typeof meta.total === "number");
      assert(typeof meta.totalPages === "number");
      assert.strictEqual(meta.totalPages, Math.ceil(meta.total / 10));
      assert(res.data.data.products.length <= 10);
    });

    it("should support custom page and limit values", async () => {
      const res = await getRequest("/api/products?page=1&limit=2");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 2);
      assert.strictEqual(res.data.data.products.length, 2);
    });

    it("should return non-overlapping products between consecutive pages", async () => {
      const page1Res = await getRequest("/api/products?page=1&limit=2");
      const page2Res = await getRequest("/api/products?page=2&limit=2");
      assert.strictEqual(page1Res.status, 200);
      assert.strictEqual(page2Res.status, 200);

      const p1Ids = new Set(page1Res.data.data.products.map((p) => p.id));
      const p2Products = page2Res.data.data.products;
      for (const p of p2Products) {
        assert(!p1Ids.has(p.id), `Product ${p.id} appeared in both page 1 and page 2`);
      }
    });

    it("should return remaining products on the last page", async () => {
      const firstRes = await getRequest("/api/products?limit=2");
      const totalPages = firstRes.data.data.pagination.totalPages;
      if (totalPages > 1) {
        const lastPageRes = await getRequest(`/api/products?page=${totalPages}&limit=2`);
        assert.strictEqual(lastPageRes.status, 200);
        assert(lastPageRes.data.data.products.length >= 1 && lastPageRes.data.data.products.length <= 2);
        assert.strictEqual(lastPageRes.data.data.pagination.page, totalPages);
      }
    });

    it("should return empty product array and totalPages=0 for zero matching products", async () => {
      const res = await getRequest("/api/products?search=NonExistentMatchZQX9999");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.products.length, 0);
      assert.strictEqual(res.data.data.pagination.total, 0);
      assert.strictEqual(res.data.data.pagination.totalPages, 0);
    });

    it("should return empty array when page is beyond totalPages range", async () => {
      const res = await getRequest("/api/products?page=99999&limit=10");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.products.length, 0);
      assert.strictEqual(res.data.data.pagination.page, 99999);
      assert(res.data.data.pagination.total >= 0);
    });

    it("should ensure total reflects all active products matching filters, not just the current page", async () => {
      const res = await getRequest("/api/products?limit=1");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.products.length, 1);
      assert(res.data.data.pagination.total > 1, "Total must reflect total matches, not limit");
    });

    it("should combine search and pagination", async () => {
      const res = await getRequest("/api/products?search=Unique%20Drill&page=1&limit=1");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.products.length, 1);
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 1);
      assert(res.data.data.pagination.total >= 1);
    });

    it("should combine category filtering and pagination", async () => {
      const res = await getRequest(`/api/products?categoryId=${categoryAlpha.id}&page=1&limit=2`);
      assert.strictEqual(res.status, 200);
      assert(res.data.data.products.length >= 1);
      assert(res.data.data.products.every((p) => p.category.id === categoryAlpha.id));
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 2);
    });

    it("should combine price sorting and pagination (ascending)", async () => {
      const res = await getRequest("/api/products?sortBy=price&sortOrder=asc&page=1&limit=3");
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.length >= 2);
      for (let i = 0; i < prods.length - 1; i++) {
        assert(Number(prods[i].price) <= Number(prods[i + 1].price));
      }
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 3);
    });

    it("should combine price sorting and pagination (descending)", async () => {
      const res = await getRequest("/api/products?sortBy=price&sortOrder=desc&page=1&limit=3");
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.length >= 2);
      for (let i = 0; i < prods.length - 1; i++) {
        assert(Number(prods[i].price) >= Number(prods[i + 1].price));
      }
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 3);
    });

    it("should combine search, category filtering, and pagination", async () => {
      const res = await getRequest(
        `/api/products?search=Unique%20Drill&categoryId=${categoryAlpha.id}&page=1&limit=2`
      );
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.length >= 1);
      assert(prods.every((p) => p.category.id === categoryAlpha.id));
      assert(prods.every((p) => p.name.toLowerCase().includes("drill")));
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 2);
      assert(res.data.data.pagination.total >= 1);
    });

    it("should combine search, price sorting, and pagination", async () => {
      const res = await getRequest("/api/products?search=Unique%20Drill&sortBy=price&sortOrder=asc&page=1&limit=2");
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.length >= 1);
      assert(prods.every((p) => p.name.toLowerCase().includes("drill")));
      for (let i = 0; i < prods.length - 1; i++) {
        assert(Number(prods[i].price) <= Number(prods[i + 1].price));
      }
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 2);
    });

    it("should combine category filtering, price sorting, and pagination", async () => {
      const res = await getRequest(
        `/api/products?categoryId=${categoryAlpha.id}&sortBy=price&sortOrder=desc&page=1&limit=2`
      );
      assert.strictEqual(res.status, 200);
      const prods = res.data.data.products;
      assert(prods.length >= 1);
      assert(prods.every((p) => p.category.id === categoryAlpha.id));
      for (let i = 0; i < prods.length - 1; i++) {
        assert(Number(prods[i].price) >= Number(prods[i + 1].price));
      }
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 2);
    });

    it("should combine all filters together (search, categoryId, sortBy, sortOrder, page, limit)", async () => {
      const res = await getRequest(
        `/api/products?search=Unique%20Drill&categoryId=${categoryAlpha.id}&sortBy=price&sortOrder=asc&page=1&limit=5`
      );
      assert.strictEqual(res.status, 200);
      assert(res.data.data.products.length >= 1);
      assert(res.data.data.products.every((p) => p.category.id === categoryAlpha.id));
      assert(res.data.data.products.every((p) => p.name.toLowerCase().includes("drill")));
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 5);
      assert(res.data.data.pagination.total >= 1);
    });

    it("should reject invalid pagination parameters with HTTP 400", async () => {
      const badPages = ["0", "-1", "1.5", "abc", ""];
      for (const p of badPages) {
        const res = await getRequest(`/api/products?page=${encodeURIComponent(p)}`);
        assert.strictEqual(res.status, 400, `Expected 400 for page=${p}`);
        assert.strictEqual(res.data.message, "Page must be a positive integer");
      }

      const badLimits = ["0", "-1", "101", "1.5", "xyz", ""];
      for (const l of badLimits) {
        const res = await getRequest(`/api/products?limit=${encodeURIComponent(l)}`);
        assert.strictEqual(res.status, 400, `Expected 400 for limit=${l}`);
        assert.strictEqual(res.data.message, "Limit must be a positive integer between 1 and 100");
      }

      const multiPage = await getRequest("/api/products?page=1&page=2");
      assert.strictEqual(multiPage.status, 400);
      assert.strictEqual(multiPage.data.message, "Multiple page values are not allowed");

      const multiLimit = await getRequest("/api/products?limit=10&limit=20");
      assert.strictEqual(multiLimit.status, 400);
      assert.strictEqual(multiLimit.data.message, "Multiple limit values are not allowed");
    });

    it("should return the standardized Product Listing response structure", async () => {
      const res = await getRequest("/api/products?page=1&limit=5");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.message, "Products fetched successfully");
      assert(res.data.data);
      assert(Array.isArray(res.data.data.products));
      assert(res.data.data.pagination);

      // Verify pagination keys
      const p = res.data.data.pagination;
      assert.strictEqual(typeof p.total, "number");
      assert.strictEqual(typeof p.page, "number");
      assert.strictEqual(typeof p.limit, "number");
      assert.strictEqual(typeof p.totalPages, "number");

      // Verify product item keys and data isolation
      if (res.data.data.products.length > 0) {
        const prod = res.data.data.products[0];
        assert.strictEqual(typeof prod.id, "string");
        assert.strictEqual(typeof prod.name, "string");
        assert(prod.price !== undefined);
        assert.strictEqual(typeof prod.stock, "number");
        assert.strictEqual(typeof prod.minOrderQuantity, "number");
        assert.strictEqual(typeof prod.unit, "string");
        assert.strictEqual(typeof prod.isFeatured, "boolean");

        // Category relation
        assert(prod.category && typeof prod.category.id === "string");
        assert(typeof prod.category.name === "string");

        // Business relation (sanitized, public seller details only)
        assert(prod.business && typeof prod.business.id === "string");
        assert(typeof prod.business.name === "string");
        assert.strictEqual(prod.business.owner, undefined);
        assert.strictEqual(prod.business.passwordHash, undefined);

        // BulkPricing relation
        assert(Array.isArray(prod.bulkPricing));
      }
    });

    it("should fetch single product by ID with full relations and sanitized seller info", async () => {
      const res = await getRequest(`/api/products/${getTestProductId}`);
      assert.strictEqual(res.status, 200);
      const prod = res.data.data;
      assert.strictEqual(prod.id, getTestProductId);
      assert(prod.category);
      assert.strictEqual(prod.category.id, categoryAlpha.id);
      assert(prod.business);
      assert.strictEqual(prod.business.id, businessAlpha.id);
      // Ensure no sensitive user information is exposed
      assert.strictEqual(prod.business.owner, undefined);
      assert.strictEqual(prod.business.passwordHash, undefined);
      assert(Array.isArray(prod.bulkPricing));
      assert.strictEqual(prod.bulkPricing.length, 1);
    });
  });

  // ========================================================
  // SECTION 5: PATCH /api/products/:id/deactivate - Product Deactivation API
  // ========================================================
  describe("PATCH /api/products/:id/deactivate - Product Deactivation API", () => {
    let deactProductId;

    before(async () => {
      const res = await postRequest("/api/products", {
        name: `Deactivate Candidate ${Date.now()}`,
        description: "Candidate for soft deactivation test",
        price: 180.0,
        stock: 50,
        minOrderQuantity: 2,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        bulkPricing: [{ minQuantity: 5, maxQuantity: null, pricePerUnit: 160.0 }],
      });
      deactProductId = res.data.data.id;
      testProductIds.push(deactProductId);
    });

    it("should successfully deactivate an active product (HTTP 200)", async () => {
      const res = await patchRequest(`/api/products/${deactProductId}/deactivate`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.message, "Product deactivated successfully");
      assert.strictEqual(res.data.data.id, deactProductId);
      assert.strictEqual(res.data.data.isActive, false);

      // Verify in DB directly
      const inDb = await prisma.product.findUnique({
        where: { id: deactProductId },
        include: { bulkPricing: true, category: true, business: true },
      });
      assert(inDb, "Product must still exist in PostgreSQL");
      assert.strictEqual(inDb.isActive, false);
      assert.strictEqual(inDb.bulkPricing.length, 1);
      assert.strictEqual(inDb.categoryId, categoryAlpha.id);
      assert.strictEqual(inDb.businessId, businessAlpha.id);
    });

    it("should reject deactivating an already inactive product (HTTP 400)", async () => {
      const res = await patchRequest(`/api/products/${deactProductId}/deactivate`);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Product is already deactivated");
    });

    it("should reject deactivating a nonexistent product (HTTP 404)", async () => {
      const res = await patchRequest("/api/products/00000000-0000-0000-0000-000000000000/deactivate");
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Product not found");
    });

    it("should reject deactivating with malformed product ID (HTTP 400)", async () => {
      const res = await patchRequest("/api/products/not-a-valid-uuid/deactivate");
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Invalid product ID format");
    });

    it("should verify deactivated product is excluded from GET listing and details", async () => {
      const listRes = await getRequest("/api/products");
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listRes.data.data.products.some((p) => p.id === deactProductId), false);

      const singleRes = await getRequest(`/api/products/${deactProductId}`);
      assert.strictEqual(singleRes.status, 404);
    });
  });

  // ========================================================
  // SECTION 6: GET /api/products/featured - Featured Products API
  // ========================================================
  describe("GET /api/products/featured - Featured Products API", () => {
    let featuredProdId;
    let nonFeaturedProdId;

    before(async () => {
      const featRes = await postRequest("/api/products", {
        name: `Featured Showcase Drill ${Date.now()}`,
        price: 299.0,
        isFeatured: true,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        bulkPricing: [{ minQuantity: 10, maxQuantity: null, pricePerUnit: 270.0 }],
      });
      featuredProdId = featRes.data.data.id;
      testProductIds.push(featuredProdId);

      const nonFeatRes = await postRequest("/api/products", {
        name: `Regular Showcase Drill ${Date.now()}`,
        price: 150.0,
        isFeatured: false,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      nonFeaturedProdId = nonFeatRes.data.data.id;
      testProductIds.push(nonFeaturedProdId);
    });

    it("should fetch featured products and exclude non-featured products", async () => {
      const res = await getRequest("/api/products/featured");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.message, "Featured products fetched successfully");
      const products = res.data.data.products;
      assert(products.some((p) => p.id === featuredProdId));
      assert(!products.some((p) => p.id === nonFeaturedProdId));
      assert(products.every((p) => p.isFeatured === true));
      assert(products.every((p) => p.isActive === true));
    });

    it("should support pagination on featured endpoint", async () => {
      const res = await getRequest("/api/products/featured?page=1&limit=1");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.products.length, 1);
      assert.strictEqual(res.data.data.pagination.page, 1);
      assert.strictEqual(res.data.data.pagination.limit, 1);
      assert(res.data.data.pagination.total >= 1);
    });

    it("should reject invalid pagination parameters with HTTP 400", async () => {
      const badPage = await getRequest("/api/products/featured?page=0");
      assert.strictEqual(badPage.status, 400);

      const badLimit = await getRequest("/api/products/featured?limit=999");
      assert.strictEqual(badLimit.status, 400);
    });

    it("should ensure GET /api/products/:id does not conflict with /featured", async () => {
      const res = await getRequest(`/api/products/${featuredProdId}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.id, featuredProdId);
    });
  });

  // ========================================================
  // SECTION 7: PATCH /api/products/:id/featured - Featured Status Management API
  // ========================================================
  describe("PATCH /api/products/:id/featured - Featured Status Management API", () => {
    let targetProductId;
    let inactiveProductId;

    before(async () => {
      const prodRes = await postRequest("/api/products", {
        name: `Status Toggle Product ${Date.now()}`,
        description: "Product for testing featured toggle endpoint",
        price: 250.0,
        stock: 45,
        minOrderQuantity: 3,
        unit: "piece",
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
        bulkPricing: [{ minQuantity: 10, maxQuantity: null, pricePerUnit: 220.0 }],
      });
      targetProductId = prodRes.data.data.id;
      testProductIds.push(targetProductId);

      const inactRes = await postRequest("/api/products", {
        name: `Inactive Featured Test Product ${Date.now()}`,
        price: 199.0,
        categoryId: categoryAlpha.id,
        businessId: businessAlpha.id,
      });
      inactiveProductId = inactRes.data.data.id;
      testProductIds.push(inactiveProductId);

      // Deactivate it
      await patchRequest(`/api/products/${inactiveProductId}/deactivate`);
    });

    it("should successfully mark an unfeatured product as featured (HTTP 200)", async () => {
      const res = await patchRequest(`/api/products/${targetProductId}/featured`, {
        isFeatured: true,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.message, "Product featured status updated successfully");
      assert.strictEqual(res.data.data.id, targetProductId);
      assert.strictEqual(res.data.data.isFeatured, true);
    });

    it("should successfully unfeature an existing featured product (HTTP 200)", async () => {
      const res = await patchRequest(`/api/products/${targetProductId}/featured`, {
        isFeatured: false,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.message, "Product featured status updated successfully");
      assert.strictEqual(res.data.data.id, targetProductId);
      assert.strictEqual(res.data.data.isFeatured, false);
    });

    it("should reject missing isFeatured field with HTTP 400", async () => {
      const res = await patchRequest(`/api/products/${targetProductId}/featured`, {});
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "isFeatured must be a boolean");
    });

    it("should reject string values such as 'true' or 'false' with HTTP 400", async () => {
      const resStrTrue = await patchRequest(`/api/products/${targetProductId}/featured`, {
        isFeatured: "true",
      });
      assert.strictEqual(resStrTrue.status, 400);
      assert.strictEqual(resStrTrue.data.success, false);

      const resStrFalse = await patchRequest(`/api/products/${targetProductId}/featured`, {
        isFeatured: "false",
      });
      assert.strictEqual(resStrFalse.status, 400);
      assert.strictEqual(resStrFalse.data.success, false);
    });

    it("should reject other non-boolean values (numbers, null, arrays) with HTTP 400", async () => {
      const values = [1, 0, null, [], {}];
      for (const val of values) {
        const res = await patchRequest(`/api/products/${targetProductId}/featured`, {
          isFeatured: val,
        });
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.data.success, false);
      }
    });

    it("should return HTTP 404 for nonexistent product ID", async () => {
      const res = await patchRequest("/api/products/00000000-0000-0000-0000-000000000000/featured", {
        isFeatured: true,
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Product not found");
    });

    it("should return HTTP 400 for malformed product UUID", async () => {
      const res = await patchRequest("/api/products/invalid-uuid-format/featured", {
        isFeatured: true,
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "Invalid product ID format");
    });

    it("should verify all other product fields and relations remain intact", async () => {
      await patchRequest(`/api/products/${targetProductId}/featured`, { isFeatured: true });

      const inDb = await prisma.product.findUnique({
        where: { id: targetProductId },
        include: { category: true, business: true, bulkPricing: true },
      });

      assert(inDb, "Product must exist in DB");
      assert.strictEqual(inDb.isFeatured, true);
      assert.strictEqual(inDb.description, "Product for testing featured toggle endpoint");
      assert.strictEqual(inDb.stock, 45);
      assert.strictEqual(inDb.minOrderQuantity, 3);
      assert.strictEqual(inDb.unit, "piece");
      assert.strictEqual(inDb.categoryId, categoryAlpha.id);
      assert.strictEqual(inDb.businessId, businessAlpha.id);
      assert.strictEqual(inDb.bulkPricing.length, 1);
      assert.strictEqual(inDb.bulkPricing[0].minQuantity, 10);
    });

    it("should reflect updated status dynamically in GET /api/products/featured", async () => {
      // Set to featured
      await patchRequest(`/api/products/${targetProductId}/featured`, { isFeatured: true });
      let featList = await getRequest("/api/products/featured");
      assert(featList.data.data.products.some((p) => p.id === targetProductId));

      // Set to unfeatured
      await patchRequest(`/api/products/${targetProductId}/featured`, { isFeatured: false });
      featList = await getRequest("/api/products/featured");
      assert(!featList.data.data.products.some((p) => p.id === targetProductId));
    });

    it("should not include inactive products in featured list even when isFeatured is true", async () => {
      // Mark inactive product as featured
      const patchRes = await patchRequest(`/api/products/${inactiveProductId}/featured`, {
        isFeatured: true,
      });
      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchRes.data.data.isFeatured, true);

      // Verify it does NOT appear in GET /api/products/featured
      const featList = await getRequest("/api/products/featured");
      assert(!featList.data.data.products.some((p) => p.id === inactiveProductId));
    });
  });
});


