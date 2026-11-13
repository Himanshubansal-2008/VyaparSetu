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

describe("VyaparSetu Quotations & Negotiation Backend Integration Suite", () => {
  let sellerUser, sellerBusiness, product;
  let buyerUser, bystanderUser;
  let category;
  let createdQuotationId;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    category = await prisma.category.findFirst({ where: { isActive: true } });
    assert.ok(category, "Category must exist");

    // 1. Setup Seller
    const sellerInit = await makeRequest("/api/users/init", {
      method: "POST",
      body: { name: "Quotation Test Seller", role: "SELLER" },
    });
    sellerUser = sellerInit.data.data;

    const bizInit = await makeRequest("/api/businesses", {
      method: "POST",
      headers: { "x-user-id": sellerUser.id },
      body: {
        name: "Quotation Test Crafts",
        category: category.name,
        city: "Jodhpur",
        state: "Rajasthan",
      },
    });
    sellerBusiness = bizInit.data.data;

    const prodRes = await makeRequest("/api/products", {
      method: "POST",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: {
        name: "Handmade Wooden Chess Set",
        description: "Carved Rosewood & Maple Chess Board",
        price: 1200,
        stock: 50,
        minOrderQuantity: 5,
        unit: "set",
        categoryId: category.id,
        businessId: sellerBusiness.id,
      },
    });
    product = prodRes.data.data;

    // 2. Setup Buyer
    const buyerInit = await makeRequest("/api/users/init", {
      method: "POST",
      body: { name: "Luxury Gift Mart", role: "BUYER" },
    });
    buyerUser = buyerInit.data.data;

    // 3. Setup Bystander
    const bystanderInit = await makeRequest("/api/users/init", {
      method: "POST",
      body: { name: "Bystander User", role: "BUYER" },
    });
    bystanderUser = bystanderInit.data.data;
  });

  after(async () => {
    if (sellerBusiness?.id) {
      await prisma.business.deleteMany({ where: { id: sellerBusiness.id } });
    }
    if (sellerUser?.id) {
      await prisma.user.deleteMany({ where: { id: sellerUser.id } });
    }
    if (buyerUser?.id) {
      await prisma.user.deleteMany({ where: { id: buyerUser.id } });
    }
    if (bystanderUser?.id) {
      await prisma.user.deleteMany({ where: { id: bystanderUser.id } });
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });

  it("1. Rejects attempt to request quotation for own business product (HTTP 403)", async () => {
    const res = await makeRequest("/api/quotations", {
      method: "POST",
      headers: { "x-user-id": sellerUser.id },
      body: {
        productId: product.id,
        requestedQuantity: 20,
        buyerTargetPrice: 1000,
      },
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /cannot request a quotation for your own business/i);
    assert.strictEqual(res.data.details?.code, "OWN_PRODUCT_QUOTATION_FORBIDDEN");
  });

  it("2. Buyer successfully submits quotation request with initial audit trail message (HTTP 201)", async () => {
    const res = await makeRequest("/api/quotations", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        productId: product.id,
        requestedQuantity: 25,
        buyerTargetPrice: 950,
        requiredByDate: "Within 20 days",
        buyerNotes: "Need velvet lined wooden storage box for each chess set.",
        deliveryAddress: {
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
        },
      },
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    const quote = res.data.data;
    assert.ok(quote.id);
    assert.ok(quote.quotationNumber);
    assert.strictEqual(quote.status, "Submitted");
    assert.strictEqual(quote.requestedQuantity, 25);
    assert.strictEqual(quote.buyerTargetPrice, 950);
    assert.strictEqual(quote.sellerBusinessId, sellerBusiness.id);
    createdQuotationId = quote.id;

    // Verify initial message in DB
    const messages = await prisma.quotationMessage.findMany({
      where: { quotationId: quote.id },
    });
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].action, "SUBMIT");
    assert.strictEqual(messages[0].senderRole, "BUYER");
    assert.strictEqual(Number(messages[0].price), 950);
  });

  it("3. Buyer can view submitted quotations via GET /api/quotations/buyer", async () => {
    const res = await makeRequest("/api/quotations/buyer", {
      headers: { "x-user-id": buyerUser.id },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const list = res.data.data;
    assert(Array.isArray(list));
    assert(list.some((q) => q.id === createdQuotationId));
  });

  it("4. Seller can view incoming quotations via GET /api/quotations/seller", async () => {
    const res = await makeRequest("/api/quotations/seller", {
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const list = res.data.data;
    assert(Array.isArray(list));
    assert(list.some((q) => q.id === createdQuotationId));
  });

  it("5. Quotation Details enforces access control and returns full negotiation history", async () => {
    // 5.1 Buyer access
    const buyerRes = await makeRequest(`/api/quotations/${createdQuotationId}`, {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(buyerRes.status, 200);
    assert.strictEqual(buyerRes.data.data.isBuyer, true);
    assert.ok(Array.isArray(buyerRes.data.data.messages));

    // 5.2 Seller access
    const sellerRes = await makeRequest(`/api/quotations/${createdQuotationId}`, {
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
    });
    assert.strictEqual(sellerRes.status, 200);
    assert.strictEqual(sellerRes.data.data.isSeller, true);

    // 5.3 Bystander forbidden
    const bystanderRes = await makeRequest(`/api/quotations/${createdQuotationId}`, {
      headers: { "x-user-id": bystanderUser.id },
    });
    assert.strictEqual(bystanderRes.status, 403);
  });

  it("6. Negotiation Round 1: Seller provides quote with price, terms, and notes (HTTP 200)", async () => {
    const res = await makeRequest(`/api/quotations/${createdQuotationId}/respond`, {
      method: "POST",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: {
        type: "quote",
        quotedUnitPrice: 1050,
        quotedQuantity: 25,
        validityDays: 14,
        dispatchTimeline: "5-7 business days",
        freightTerms: "Doorstep delivery included via BlueDart B2B",
        sellerNotes: "We can include velvet lined gift boxes at ₹1050/set.",
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const quote = res.data.data;
    assert.strictEqual(quote.status, "Quotation Provided");
    assert.strictEqual(quote.quotedUnitPrice, 1050);
    assert.strictEqual(quote.quotedTotalAmount, 26250); // 25 * 1050
    assert.ok(quote.validUntil);

    // Audit trail has 2 messages now
    const details = await makeRequest(`/api/quotations/${createdQuotationId}`, {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(details.data.data.messages.length, 2);
    assert.strictEqual(details.data.data.messages[1].action, "QUOTE");
    assert.strictEqual(details.data.data.messages[1].senderRole, "SELLER");
    assert.strictEqual(details.data.data.messages[1].price, 1050);
  });

  it("7. Negotiation Round 2: Buyer counters with updated target price and quantity (HTTP 200)", async () => {
    const res = await makeRequest(`/api/quotations/${createdQuotationId}/buyer-counter`, {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        counterPrice: 1000,
        counterQuantity: 30,
        buyerNotes: "If we increase volume to 30 sets, can you do ₹1000/set?",
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const quote = res.data.data;
    assert.strictEqual(quote.status, "Counter-Offer Made");
    assert.strictEqual(quote.isCounterOffer, true);
    assert.strictEqual(quote.buyerTargetPrice, 1000);
    assert.strictEqual(quote.requestedQuantity, 30);

    // Audit trail has 3 messages
    const details = await makeRequest(`/api/quotations/${createdQuotationId}`, {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(details.data.data.messages.length, 3);
    assert.strictEqual(details.data.data.messages[2].action, "BUYER_COUNTER");
  });

  it("8. Negotiation Round 3: Seller counters or updates quote to ₹1000 for 30 sets (HTTP 200)", async () => {
    const res = await makeRequest(`/api/quotations/${createdQuotationId}/respond`, {
      method: "POST",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: {
        type: "quote",
        quotedUnitPrice: 1000,
        quotedQuantity: 30,
        validityDays: 10,
        sellerNotes: "Agreed! 30 sets at ₹1000/set with premium packaging.",
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.status, "Quotation Provided");
    assert.strictEqual(res.data.data.quotedUnitPrice, 1000);
    assert.strictEqual(res.data.data.quotedQuantity, 30);
    assert.strictEqual(res.data.data.quotedTotalAmount, 30000);
  });

  it("9. Buyer accepts agreed quotation (HTTP 200)", async () => {
    const res = await makeRequest(`/api/quotations/${createdQuotationId}/accept`, {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.status, "Accepted");
    assert.ok(res.data.data.acceptedAt);
  });

  it("10. Converts accepted quotation into order with locked price and decrements stock (HTTP 201)", async () => {
    const stockBefore = (await prisma.product.findUnique({ where: { id: product.id } })).stock;
    assert.strictEqual(stockBefore, 50);

    const res = await makeRequest(`/api/quotations/${createdQuotationId}/convert-to-order`, {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        deliveryAddress: {
          street: "Suite 4B, MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
        },
        paymentMethod: "Trade Credit / RTGS / NEFT",
      },
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    const order = res.data.data;
    assert.ok(order.id);
    assert.strictEqual(order.quotationId, createdQuotationId);
    assert.strictEqual(order.subtotal, 30000); // 30 * 1000
    assert.strictEqual(order.totalAmount, 30000);
    assert.strictEqual(order.totalUnits, 30);
    assert.strictEqual(order.items[0].unitPrice, 1000);

    // Stock decremented from 50 to 20
    const stockAfter = (await prisma.product.findUnique({ where: { id: product.id } })).stock;
    assert.strictEqual(stockAfter, 20);

    // Quotation status updated to "Ordered"
    const quoteAfter = await prisma.quotation.findUnique({
      where: { id: createdQuotationId },
      include: { order: true },
    });
    assert.strictEqual(quoteAfter.status, "Ordered");
    assert.strictEqual(quoteAfter.order?.id, order.id);
  });

  it("11. Strictly prevents duplicate order creation from the same quotation (HTTP 409 Conflict)", async () => {
    const res = await makeRequest(`/api/quotations/${createdQuotationId}/convert-to-order`, {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        deliveryAddress: { street: "Repeat Order Attempt" },
      },
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /already been converted to an order/i);

    // Also direct POST /api/orders with same quotationId is rejected with 409 Conflict!
    const directOrderRes = await makeRequest("/api/orders", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        quotationId: createdQuotationId,
        items: [{ productId: product.id, quantity: 30, quotationId: createdQuotationId }],
      },
    });
    assert.strictEqual(directOrderRes.status, 409);
    assert.match(directOrderRes.data.message, /already been converted to order/i);
  });

  it("12. Buyer rejection workflow marks quotation rejected and logs audit trail", async () => {
    // Create new quotation to test buyer rejection
    const newQuoteRes = await makeRequest("/api/quotations", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        productId: product.id,
        requestedQuantity: 10,
        buyerTargetPrice: 800,
      },
    });
    const quoteId = newQuoteRes.data.data.id;

    // Seller quotes 1100
    await makeRequest(`/api/quotations/${quoteId}/respond`, {
      method: "POST",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: { type: "quote", quotedUnitPrice: 1100, quotedQuantity: 10 },
    });

    // Buyer rejects
    const rejectRes = await makeRequest(`/api/quotations/${quoteId}/reject`, {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: { reason: "Budget exceeded client allowance" },
    });

    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.data.data.status, "Rejected by Buyer");
    assert.strictEqual(rejectRes.data.data.buyerRejectionReason, "Budget exceeded client allowance");
  });

  it("13. Seller rejection workflow marks quotation rejected and logs audit trail", async () => {
    const newQuoteRes = await makeRequest("/api/quotations", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        productId: product.id,
        requestedQuantity: 5,
        buyerTargetPrice: 600,
      },
    });
    const quoteId = newQuoteRes.data.data.id;

    const rejectRes = await makeRequest(`/api/quotations/${quoteId}/respond`, {
      method: "POST",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: {
        type: "reject",
        rejectionReason: "Target price is below artisan manufacturing cost",
      },
    });

    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.data.data.status, "Rejected by Seller");
    assert.strictEqual(rejectRes.data.data.rejectionReason, "Target price is below artisan manufacturing cost");
  });
});
