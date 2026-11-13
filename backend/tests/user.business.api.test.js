/**
 * Automated Test Suite: User Identity and Business Profile APIs
 * Tests POST /api/users/init, GET /api/users/me, GET /api/users/:id,
 * POST /api/businesses, GET /api/businesses/me, GET /api/businesses/:id,
 * PUT /api/businesses/:id, and PostgreSQL database consistency.
 * 
 * Uses Node.js native test runner (node:test) and assert (node:assert).
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

describe("Phase 1: User Identity & Business Profile Test Suite", () => {
  const createdUserIds = [];
  const createdBusinessIds = [];

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    // Clean up created businesses and users in reverse dependency order
    for (const bizId of createdBusinessIds) {
      await prisma.business.deleteMany({ where: { id: bizId } }).catch(() => {});
    }
    for (const uId of createdUserIds) {
      await prisma.user.deleteMany({ where: { id: uId } }).catch(() => {});
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect().catch(() => {});
  });

  // ========================================================
  // SECTION 1: USER INITIALIZATION API
  // ========================================================
  describe("POST /api/users/init - User Initialization API", () => {
    it("should initialize a new buyer user without credentials and return a valid UUID", async () => {
      const res = await postRequest("/api/users/init", {});
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert(res.data.data.id, "User must have an ID");
      assert(UUID_REGEX.test(res.data.data.id), "User ID must be a standard UUID");
      assert.strictEqual(res.data.data.name, "Guest Buyer");
      assert.strictEqual(res.data.data.role, "BUYER");
      assert.strictEqual(res.data.data.email, null);
      assert.strictEqual(res.data.data.passwordHash, null);

      createdUserIds.push(res.data.data.id);
    });

    it("should initialize user with custom name and contact details", async () => {
      const uniqueEmail = `buyer-${Date.now()}@test.vyaparsetu.com`;
      const res = await postRequest("/api/users/init", {
        name: "Rahul Verma",
        email: uniqueEmail,
        phone: "+91 9876543210",
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.name, "Rahul Verma");
      assert.strictEqual(res.data.data.email, uniqueEmail);
      assert.strictEqual(res.data.data.phone, "+91 9876543210");
      assert.strictEqual(res.data.data.role, "BUYER");

      createdUserIds.push(res.data.data.id);
    });

    it("should retrieve the same existing user when valid userId is sent in body", async () => {
      // First create
      const createRes = await postRequest("/api/users/init", { name: "Persistent Buyer" });
      const userId = createRes.data.data.id;
      createdUserIds.push(userId);

      // Call init again with existing userId (simulating app restart)
      const restartRes = await postRequest("/api/users/init", { userId });
      assert.strictEqual(restartRes.status, 200);
      assert.strictEqual(restartRes.data.success, true);
      assert.strictEqual(restartRes.data.data.id, userId);
      assert.strictEqual(restartRes.data.data.name, "Persistent Buyer");
    });

    it("should retrieve existing user when x-user-id header is provided", async () => {
      const createRes = await postRequest("/api/users/init", { name: "Header Buyer" });
      const userId = createRes.data.data.id;
      createdUserIds.push(userId);

      const res = await postRequest("/api/users/init", {}, { "x-user-id": userId });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.id, userId);
    });

    it("should retrieve user via GET /api/users/:id", async () => {
      const createRes = await postRequest("/api/users/init", { name: "Lookup Buyer" });
      const userId = createRes.data.data.id;
      createdUserIds.push(userId);

      const getRes = await getRequest(`/api/users/${userId}`);
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.data.success, true);
      assert.strictEqual(getRes.data.data.id, userId);
      assert.strictEqual(getRes.data.data.name, "Lookup Buyer");
    });

    it("should retrieve user via GET /api/users/me using x-user-id header", async () => {
      const createRes = await postRequest("/api/users/init", { name: "Me Buyer" });
      const userId = createRes.data.data.id;
      createdUserIds.push(userId);

      const meRes = await getRequest("/api/users/me", { "x-user-id": userId });
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.data.success, true);
      assert.strictEqual(meRes.data.data.id, userId);
    });

    it("should return HTTP 400 for GET /api/users/me when x-user-id header is missing", async () => {
      const meRes = await getRequest("/api/users/me");
      assert.strictEqual(meRes.status, 400);
      assert.strictEqual(meRes.data.success, false);
    });

    it("should return HTTP 400 for malformed user UUID in GET /api/users/:id", async () => {
      const res = await getRequest("/api/users/invalid-uuid-123");
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.message, "Invalid user ID format");
    });

    it("should return HTTP 404 for non-existent user UUID in GET /api/users/:id", async () => {
      const res = await getRequest("/api/users/00000000-0000-0000-0000-000000000000");
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.message, "User not found");
    });
  });

  // ========================================================
  // SECTION 2: BUSINESS PROFILE CREATION API
  // ========================================================
  describe("POST /api/businesses - Business Profile Creation API", () => {
    let testUserId;

    before(async () => {
      const userRes = await postRequest("/api/users/init", { name: "Seller Owner User" });
      testUserId = userRes.data.data.id;
      createdUserIds.push(testUserId);
    });

    it("should successfully create a business profile linked to owner User", async () => {
      const payload = {
        name: "Shree Ganesh Textiles",
        description: "Wholesale manufacturer of cotton fabric and bedsheets",
        category: "Clothing & Textiles",
        address: "Plot 10, GIDC Industrial Estate",
        city: "Surat",
        state: "Gujarat",
        pincode: "395003",
        phone: "+91 9825012345",
        email: "contact@shreeganesh.com",
      };

      const res = await postRequest("/api/businesses", payload, { "x-user-id": testUserId });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert(res.data.data.id, "Business must have an ID");
      assert(UUID_REGEX.test(res.data.data.id), "Business ID must be a standard UUID");
      assert.strictEqual(res.data.data.name, "Shree Ganesh Textiles");
      assert.strictEqual(res.data.data.city, "Surat");
      assert.strictEqual(res.data.data.ownerId, testUserId);

      createdBusinessIds.push(res.data.data.id);

      // Verify record exists in PostgreSQL directly
      const inDb = await prisma.business.findUnique({
        where: { id: res.data.data.id },
      });
      assert(inDb, "Business must exist in PostgreSQL");
      assert.strictEqual(inDb.name, "Shree Ganesh Textiles");
      assert.strictEqual(inDb.ownerId, testUserId);

      // Verify User role was updated to SELLER in PostgreSQL
      const userInDb = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      assert.strictEqual(userInDb.role, "SELLER");
    });

    it("should prevent duplicate business profiles for the same owner (HTTP 409 Conflict)", async () => {
      const payload = {
        name: "Duplicate Second Business",
        city: "Mumbai",
      };

      const res = await postRequest("/api/businesses", payload, { "x-user-id": testUserId });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.message, "User already has an existing business profile");
      assert(res.data.data, "Should return existing business data");
    });

    it("should reject business creation when owner ID is missing", async () => {
      const res = await postRequest("/api/businesses", { name: "No Owner Business" });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.success, false);
      assert(res.data.message.includes("Valid owner ID"));
    });

    it("should reject business creation when business name is empty", async () => {
      const userRes = await postRequest("/api/users/init", { name: "Another User" });
      const newUserId = userRes.data.data.id;
      createdUserIds.push(newUserId);

      const res = await postRequest("/api/businesses", { name: "   " }, { "x-user-id": newUserId });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.message, "Business name is required");
    });

    it("should reject business creation for non-existent owner UUID (HTTP 404)", async () => {
      const res = await postRequest(
        "/api/businesses",
        { name: "Ghost Business" },
        { "x-user-id": "00000000-0000-0000-0000-000000000000" }
      );
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.message, "Owner user not found");
    });
  });

  // ========================================================
  // SECTION 3: BUSINESS PROFILE RETRIEVAL AND UPDATE APIs
  // ========================================================
  describe("GET & PUT /api/businesses APIs", () => {
    let ownerUserId;
    let businessId;

    before(async () => {
      const userRes = await postRequest("/api/users/init", { name: "Owner For GetPut" });
      ownerUserId = userRes.data.data.id;
      createdUserIds.push(ownerUserId);

      const bizRes = await postRequest(
        "/api/businesses",
        {
          name: "Original Biz Name",
          city: "Jaipur",
          state: "Rajasthan",
          phone: "9829012345",
        },
        { "x-user-id": ownerUserId }
      );
      businessId = bizRes.data.data.id;
      createdBusinessIds.push(businessId);
    });

    it("should retrieve business by owner via GET /api/businesses/me", async () => {
      const res = await getRequest("/api/businesses/me", { "x-user-id": ownerUserId });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.id, businessId);
      assert.strictEqual(res.data.data.name, "Original Biz Name");
      assert.strictEqual(res.data.data.city, "Jaipur");
    });

    it("should return HTTP 404 from GET /api/businesses/me when user has no business", async () => {
      const newUserRes = await postRequest("/api/users/init", { name: "Pure Buyer" });
      const buyerId = newUserRes.data.data.id;
      createdUserIds.push(buyerId);

      const res = await getRequest("/api/businesses/me", { "x-user-id": buyerId });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.message, "No business profile found for this user");
    });

    it("should retrieve business by ID via GET /api/businesses/:id", async () => {
      const res = await getRequest(`/api/businesses/${businessId}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.id, businessId);
      assert.strictEqual(res.data.data.name, "Original Biz Name");
    });

    it("should reject GET /api/businesses/:id with malformed UUID", async () => {
      const res = await getRequest("/api/businesses/not-a-valid-uuid");
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.message, "Invalid business ID format");
    });

    it("should return HTTP 404 for GET /api/businesses/:id with non-existent UUID", async () => {
      const res = await getRequest("/api/businesses/00000000-0000-0000-0000-000000000000");
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.message, "Business not found");
    });

    it("should successfully update business profile via PUT /api/businesses/:id", async () => {
      const updatePayload = {
        name: "Updated Biz Name",
        city: "Udaipur",
        description: "Expanded handicrafts and textiles workshop",
      };

      const res = await putRequest(`/api/businesses/${businessId}`, updatePayload, {
        "x-user-id": ownerUserId,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.data.name, "Updated Biz Name");
      assert.strictEqual(res.data.data.city, "Udaipur");
      assert.strictEqual(res.data.data.state, "Rajasthan"); // preserved

      // Verify in PostgreSQL
      const inDb = await prisma.business.findUnique({ where: { id: businessId } });
      assert.strictEqual(inDb.name, "Updated Biz Name");
      assert.strictEqual(inDb.city, "Udaipur");
    });

    it("should reject update from a different user (HTTP 403 Forbidden)", async () => {
      const otherUserRes = await postRequest("/api/users/init", { name: "Intruder User" });
      const otherUserId = otherUserRes.data.data.id;
      createdUserIds.push(otherUserId);

      const res = await putRequest(
        `/api/businesses/${businessId}`,
        { name: "Hacked Biz" },
        { "x-user-id": otherUserId }
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.success, false);
      assert(res.data.message.includes("Unauthorized"));
    });

    it("should reject update with empty name (HTTP 400)", async () => {
      const res = await putRequest(
        `/api/businesses/${businessId}`,
        { name: "  " },
        { "x-user-id": ownerUserId }
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.message, "Business name cannot be empty");
    });
  });
});

