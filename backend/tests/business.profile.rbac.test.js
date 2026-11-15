const { describe, it, before } = require("node:test");
const assert = require("node:assert");
const prisma = require("../src/lib/prisma");
const { getSellerOrders } = require("../src/controllers/seller.controller");
const { getSellerQuotations } = require("../src/controllers/quotation.controller");

describe("Business Profile RBAC & Ownership Enforcement Tests", async () => {
  let isBusinessOwnedByCurrentUser;
  let canUserManageSellerFeatures;
  let isProductOwnedByCurrentSeller;

  before(async () => {
    const mod = await import("../../mobile/src/data/businessProfileData.js");
    isBusinessOwnedByCurrentUser = mod.isBusinessOwnedByCurrentUser;
    canUserManageSellerFeatures = mod.canUserManageSellerFeatures;
    isProductOwnedByCurrentSeller = mod.isProductOwnedByCurrentSeller;
  });

  const sellerBusiness1 = {
    id: "biz-001",
    sellerId: "biz-001",
    businessName: "Shree Handloom Works",
    ownerName: "Mukesh Patel",
    ownerId: "user-seller-1",
  };

  const sellerBusiness2 = {
    id: "biz-002",
    sellerId: "biz-002",
    businessName: "TechSource Distributors",
    ownerName: "Amit Verma",
    ownerId: "user-seller-2",
  };

  const buyerUser = {
    id: "user-buyer-1",
    name: "Regular Buyer",
    role: "BUYER",
    business: null,
  };

  const sellerUser1 = {
    id: "user-seller-1",
    name: "Mukesh Patel",
    role: "SELLER",
    business: { id: "biz-001", name: "Shree Handloom Works" },
  };

  const sellerUser2 = {
    id: "user-seller-2",
    name: "Amit Verma",
    role: "SELLER",
    business: { id: "biz-002", name: "TechSource Distributors" },
  };

  describe("1. canUserManageSellerFeatures", () => {
    it("should return false for pure buyer without business", () => {
      const allowed = canUserManageSellerFeatures(buyerUser, null);
      assert.strictEqual(allowed, false, "Buyer should not have seller management privileges");
    });

    it("should return true for seller with SELLER role", () => {
      const allowed = canUserManageSellerFeatures(sellerUser1, sellerBusiness1);
      assert.strictEqual(allowed, true, "Seller should have seller management privileges");
    });

    it("should return true for BOTH and ADMIN roles", () => {
      assert.strictEqual(canUserManageSellerFeatures({ role: "BOTH" }, null), true);
      assert.strictEqual(canUserManageSellerFeatures({ role: "ADMIN" }, null), true);
    });
  });

  describe("2. isBusinessOwnedByCurrentUser", () => {
    it("should return false when a buyer views any seller's business profile", () => {
      const isOwner1 = isBusinessOwnedByCurrentUser(sellerBusiness1, null, buyerUser);
      assert.strictEqual(isOwner1, false, "Buyer must not be treated as owner of seller 1");

      const isOwner2 = isBusinessOwnedByCurrentUser(sellerBusiness2, null, buyerUser);
      assert.strictEqual(isOwner2, false, "Buyer must not be treated as owner of seller 2");
    });

    it("should return true when a seller views their own business profile", () => {
      const isOwner = isBusinessOwnedByCurrentUser(sellerBusiness1, sellerBusiness1, sellerUser1);
      assert.strictEqual(isOwner, true, "Seller 1 must be treated as owner of their own business");
    });

    it("should return false when a seller views another seller's business profile", () => {
      const isOwner = isBusinessOwnedByCurrentUser(sellerBusiness2, sellerBusiness1, sellerUser1);
      assert.strictEqual(isOwner, false, "Seller 1 must NOT be treated as owner of Seller 2's business");
    });

    it("should return false when an unauthenticated user views a seller's business profile", () => {
      const isOwner = isBusinessOwnedByCurrentUser(sellerBusiness1, null, null);
      assert.strictEqual(isOwner, false, "Unauthenticated user must NOT be treated as owner");
    });

    it("should correctly identify ownership by matching businessId string", () => {
      const isOwner = isBusinessOwnedByCurrentUser("biz-001", sellerBusiness1, sellerUser1);
      assert.strictEqual(isOwner, true, "Should match by business ID string for own business");

      const isNotOwner = isBusinessOwnedByCurrentUser("biz-002", sellerBusiness1, sellerUser1);
      assert.strictEqual(isNotOwner, false, "Should not match different business ID string");
    });
  });

  describe("3. isProductOwnedByCurrentSeller", () => {
    const product1 = {
      id: "prod-1",
      name: "Handloom Scarf",
      sellerId: "biz-001",
      businessId: "biz-001",
    };

    const product2 = {
      id: "prod-2",
      name: "Bluetooth Speaker",
      sellerId: "biz-002",
      businessId: "biz-002",
    };

    it("should return true when product belongs to current seller", () => {
      const isOwned = isProductOwnedByCurrentSeller(product1, sellerBusiness1);
      assert.strictEqual(isOwned, true, "Product 1 belongs to Seller 1");
    });

    it("should return false when product belongs to another seller", () => {
      const isOwned = isProductOwnedByCurrentSeller(product2, sellerBusiness1);
      assert.strictEqual(isOwned, false, "Product 2 does NOT belong to Seller 1");
    });

    it("should return false for buyer with no session profile", () => {
      const isOwned = isProductOwnedByCurrentSeller(product1, null);
      assert.strictEqual(isOwned, false, "Buyer does not own Product 1");
    });
  });

  describe("4. Backend Controller RBAC & Ownership Enforcement", () => {
    const testBuyerUUID = "00000000-0000-4000-8000-000000000001";
    const testSeller1UUID = "00000000-0000-4000-8000-000000000002";
    const testBiz1UUID = "00000000-0000-4000-8000-000000000003";
    const testBiz2UUID = "00000000-0000-4000-8000-000000000004";

    const createMockRes = () => {
      const res = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          return this;
        },
      };
      return res;
    };

    before(() => {
      prisma.user.findUnique = async (args) => {
        const id = args?.where?.id;
        if (id === testBuyerUUID) {
          return {
            id: testBuyerUUID,
            name: "Test Buyer",
            role: "BUYER",
            business: null,
          };
        }
        if (id === testSeller1UUID) {
          return {
            id: testSeller1UUID,
            name: "Test Seller",
            role: "SELLER",
            business: { id: testBiz1UUID, name: "Seller 1 Business" },
          };
        }
        return null;
      };
    });

    it("GET /api/seller/orders: rejects access for user with BUYER role (HTTP 403)", async () => {
      const req = {
        headers: { "x-user-id": testBuyerUUID },
        query: {},
      };
      const res = createMockRes();

      await getSellerOrders(req, res);

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /Only registered business owners/i);
    });

    it("GET /api/seller/orders: rejects seller attempting to query another businessId (HTTP 403)", async () => {
      const req = {
        headers: { "x-user-id": testSeller1UUID },
        query: { businessId: testBiz2UUID },
      };
      const res = createMockRes();

      await getSellerOrders(req, res);

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /You do not have permission to access another seller's orders/i);
    });

    it("GET /api/quotations/seller: rejects access for user with BUYER role (HTTP 403)", async () => {
      const req = {
        headers: { "x-user-id": testBuyerUUID },
        query: {},
      };
      const res = createMockRes();

      await getSellerQuotations(req, res);

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /Only registered business owners/i);
    });

    it("GET /api/quotations/seller: rejects seller attempting to query another businessId (HTTP 403)", async () => {
      const req = {
        headers: { "x-user-id": testSeller1UUID },
        query: { businessId: testBiz2UUID },
      };
      const res = createMockRes();

      await getSellerQuotations(req, res);

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /You do not have permission to access another seller's quotation requests/i);
    });
  });
});
