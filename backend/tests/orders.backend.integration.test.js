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

describe("VyaparSetu Orders Backend Integration Test Suite", () => {
  let sellerUser, sellerBusiness, productA, productB;
  let buyerUser, bystanderUser;
  let category;
  let createdOrderId;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    category = await prisma.category.findFirst({ where: { isActive: true } });
    assert.ok(category, "Category must exist");

    // 1. Create Seller User & Business
    const sellerInit = await makeRequest("/api/users/init", {
      method: "POST",
      body: { name: "Order Test Seller", role: "SELLER" },
    });
    sellerUser = sellerInit.data.data;

    const bizInit = await makeRequest("/api/businesses", {
      method: "POST",
      headers: { "x-user-id": sellerUser.id },
      body: {
        name: "Order Test Mills",
        category: category.name,
        city: "Surat",
        state: "Gujarat",
      },
    });
    sellerBusiness = bizInit.data.data;

    // 2. Create Products with bulk tiers and stock
    const prodResA = await makeRequest("/api/products", {
      method: "POST",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: {
        name: "Premium Cotton Fabrics",
        description: "100% Combed Cotton Fabric",
        price: 300,
        stock: 100,
        minOrderQuantity: 10,
        unit: "meter",
        categoryId: category.id,
        businessId: sellerBusiness.id,
        bulkPricing: [
          { minQuantity: 10, maxQuantity: 24, pricePerUnit: 280 },
          { minQuantity: 25, maxQuantity: 49, pricePerUnit: 260 },
          { minQuantity: 50, pricePerUnit: 240 },
        ],
      },
    });
    productA = prodResA.data.data;

    const prodResB = await makeRequest("/api/products", {
      method: "POST",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: {
        name: "Silk Dupattas",
        description: "Pure Banarasi Silk",
        price: 500,
        stock: 30,
        minOrderQuantity: 5,
        unit: "piece",
        categoryId: category.id,
        businessId: sellerBusiness.id,
      },
    });
    productB = prodResB.data.data;

    // 3. Create Buyer User
    const buyerInit = await makeRequest("/api/users/init", {
      method: "POST",
      body: { name: "Wholesale Apparel Retailer", role: "BUYER" },
    });
    buyerUser = buyerInit.data.data;

    // 4. Create Bystander User (unauthorized)
    const bystanderInit = await makeRequest("/api/users/init", {
      method: "POST",
      body: { name: "Unrelated User", role: "BUYER" },
    });
    bystanderUser = bystanderInit.data.data;
  });

  after(async () => {
    // Cleanup created test records
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

  it("1. Pre-flight order validation checks stock and MOQ", async () => {
    // 1.1 Fails if quantity is below MOQ (10)
    const belowMoqRes = await makeRequest("/api/orders/validate", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        items: [{ productId: productA.id, quantity: 5 }],
      },
    });
    assert.strictEqual(belowMoqRes.status, 400);
    assert.match(belowMoqRes.data.message, /minimum order quantity/i);

    // 1.2 Fails if quantity exceeds available stock (100)
    const overStockRes = await makeRequest("/api/orders/validate", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        items: [{ productId: productA.id, quantity: 150 }],
      },
    });
    assert.strictEqual(overStockRes.status, 400);
    assert.match(overStockRes.data.message, /insufficient stock/i);

    // 1.3 Passes when valid
    const validRes = await makeRequest("/api/orders/validate", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        items: [{ productId: productA.id, quantity: 30 }],
      },
    });
    assert.strictEqual(validRes.status, 200);
    assert.strictEqual(validRes.data.success, true);
    assert.strictEqual(validRes.data.data.validatedItems[0].price, 260); // 25-49 tier = 260
  });

  it("2. Successfully places an order in PostgreSQL, validates bulk tiers and decrements stock", async () => {
    // Add product to buyer's cart first to verify cart is cleared on checkout
    await makeRequest("/api/cart/items", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: { productId: productA.id, quantity: 30 },
    });

    const initialStock = (await prisma.product.findUnique({ where: { id: productA.id } })).stock;
    assert.strictEqual(initialStock, 100);

    const placeRes = await makeRequest("/api/orders", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        items: [
          // Client sends price: 10 (spoofed!), backend must enforce 260 tier price!
          { productId: productA.id, quantity: 30, unitPrice: 10 },
        ],
        deliveryAddress: {
          name: "Wholesale Apparel Retailer",
          street: "Shop 10, Textile Market",
          city: "Ahmedabad",
          state: "Gujarat",
          pincode: "380002",
        },
        paymentMethod: "Trade Credit / RTGS / NEFT",
      },
    });

    assert.strictEqual(placeRes.status, 201);
    assert.strictEqual(placeRes.data.success, true);
    const order = placeRes.data.data;
    assert.ok(order.id);
    assert.ok(order.orderNumber);
    createdOrderId = order.id;

    // Verify calculated totals: 30 units * 260 = 7800
    assert.strictEqual(order.subtotal, 7800);
    assert.strictEqual(order.totalAmount, 7800);
    assert.strictEqual(order.totalUnits, 30);
    assert.strictEqual(order.items[0].unitPrice, 260);

    // Verify product stock was decremented from 100 to 70 in PostgreSQL
    const updatedStock = (await prisma.product.findUnique({ where: { id: productA.id } })).stock;
    assert.strictEqual(updatedStock, 70);

    // Verify buyer's cart was cleared in PostgreSQL
    const cartRes = await makeRequest("/api/cart", {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(cartRes.data.data.items.length, 0);
  });

  it("3. Buyer can fetch their order history via GET /api/orders", async () => {
    const res = await makeRequest("/api/orders", {
      headers: { "x-user-id": buyerUser.id },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const orders = res.data.data;
    assert(Array.isArray(orders));
    assert(orders.length >= 1);
    assert.strictEqual(orders[0].id, createdOrderId);
  });

  it("4. Seller can fetch incoming orders via GET /api/seller/orders", async () => {
    const res = await makeRequest("/api/seller/orders", {
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    const sellerOrders = res.data.data;
    assert(Array.isArray(sellerOrders));
    assert(sellerOrders.length >= 1);
    assert.strictEqual(sellerOrders[0].id, createdOrderId);
    assert.strictEqual(sellerOrders[0].sellerSubtotal, 7800);
  });

  it("5. Order Details enforces strict access control", async () => {
    // 5.1 Buyer can access
    const buyerRes = await makeRequest(`/api/orders/${createdOrderId}`, {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(buyerRes.status, 200);
    assert.strictEqual(buyerRes.data.data.isBuyer, true);

    // 5.2 Seller can access
    const sellerRes = await makeRequest(`/api/orders/${createdOrderId}`, {
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
    });
    assert.strictEqual(sellerRes.status, 200);
    assert.strictEqual(sellerRes.data.data.isSeller, true);

    // 5.3 Bystander is forbidden (HTTP 403)
    const bystanderRes = await makeRequest(`/api/orders/${createdOrderId}`, {
      headers: { "x-user-id": bystanderUser.id },
    });
    assert.strictEqual(bystanderRes.status, 403);
    assert.match(bystanderRes.data.message, /access denied/i);
  });

  it("6. Seller updates order status through progression lifecycle", async () => {
    // 6.1 Confirmed -> Processing
    const processingRes = await makeRequest(`/api/orders/${createdOrderId}/status`, {
      method: "PUT",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: { status: "Processing" },
    });
    assert.strictEqual(processingRes.status, 200);
    assert.strictEqual(processingRes.data.data.status, "Processing");
    assert.ok(processingRes.data.data.acceptedAt);

    // 6.2 Processing -> Dispatched with carrier info
    const dispatchedRes = await makeRequest(`/api/orders/${createdOrderId}/status`, {
      method: "PUT",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: {
        status: "Dispatched",
        carrierName: "V-Trans Logistics",
        trackingNumber: "VT-9021482",
      },
    });
    assert.strictEqual(dispatchedRes.status, 200);
    assert.strictEqual(dispatchedRes.data.data.status, "Dispatched");
    assert.strictEqual(dispatchedRes.data.data.carrierName, "V-Trans Logistics");
    assert.ok(dispatchedRes.data.data.dispatchedAt);

    // 6.3 Dispatched -> Out for Delivery
    const outRes = await makeRequest(`/api/orders/${createdOrderId}/status`, {
      method: "PUT",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: { status: "Out for Delivery" },
    });
    assert.strictEqual(outRes.status, 200);
    assert.strictEqual(outRes.data.data.status, "Out for Delivery");

    // 6.4 Out for Delivery -> Delivered
    const deliveredRes = await makeRequest(`/api/orders/${createdOrderId}/status`, {
      method: "PUT",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: { status: "Delivered" },
    });
    assert.strictEqual(deliveredRes.status, 200);
    assert.strictEqual(deliveredRes.data.data.status, "Delivered");
    assert.ok(deliveredRes.data.data.deliveredAt);

    // 6.5 Invalid transition (Delivered -> Confirmed) rejected
    const invalidRes = await makeRequest(`/api/orders/${createdOrderId}/status`, {
      method: "PUT",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: { status: "Confirmed" },
    });
    assert.strictEqual(invalidRes.status, 400);
  });

  it("7. Order cancellation / rejection restores product stock in PostgreSQL", async () => {
    // Place a new order for productB (quantity 10)
    const stockBefore = (await prisma.product.findUnique({ where: { id: productB.id } })).stock;
    assert.strictEqual(stockBefore, 30);

    const newOrderRes = await makeRequest("/api/orders", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        items: [{ productId: productB.id, quantity: 10 }],
      },
    });
    assert.strictEqual(newOrderRes.status, 201);
    const orderToCancel = newOrderRes.data.data;

    // Stock should be decremented to 20
    const stockAfterPlace = (await prisma.product.findUnique({ where: { id: productB.id } })).stock;
    assert.strictEqual(stockAfterPlace, 20);

    // Cancel order
    const cancelRes = await makeRequest(`/api/orders/${orderToCancel.id}/status`, {
      method: "PUT",
      headers: { "x-user-id": buyerUser.id },
      body: { status: "Cancelled", cancellationReason: "Buyer changed shipment destination" },
    });
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.data.data.status, "Cancelled");

    // Product stock must be restored to 30!
    const restoredStock = (await prisma.product.findUnique({ where: { id: productB.id } })).stock;
    assert.strictEqual(restoredStock, 30);
  });
});
