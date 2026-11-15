/**
 * Automated Test Suite: Notification System APIs & Event Triggers
 * Tests Notification model, APIs (fetch, unread count, mark read, mark all read, delete),
 * user isolation, and triggers across Orders and Quotations.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const notificationService = require("../src/services/notification.service");
const orderService = require("../src/services/order.service");
const quotationService = require("../src/services/quotation.service");

let server;
let baseUrl;

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const fetchOptions = {
    method: options.method || "GET",
    headers,
  };
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe("Notification System & Trigger Integration Test Suite", () => {
  let buyerUser;
  let sellerUser;
  let sellerBusiness;
  let testCategory;
  let testProduct;
  let otherUser;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // Create Buyer User
    buyerUser = await prisma.user.create({
      data: {
        name: `Notification Test Buyer ${timestamp}`,
        email: `buyer.notif.${timestamp}@test.com`,
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        role: "BUYER",
      },
    });

    // Create Seller User & Business
    sellerUser = await prisma.user.create({
      data: {
        name: `Notification Test Seller ${timestamp}`,
        email: `seller.notif.${timestamp}@test.com`,
        phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
        role: "SELLER",
      },
    });

    sellerBusiness = await prisma.business.create({
      data: {
        name: `Notification Seller Enterprise ${timestamp}`,
        ownerId: sellerUser.id,
        category: "Electronics",
        city: "Mumbai",
        state: "Maharashtra",
      },
    });

    // Create Other User for isolation checks
    otherUser = await prisma.user.create({
      data: {
        name: `Other User ${timestamp}`,
        email: `other.notif.${timestamp}@test.com`,
        phone: `93${Math.floor(10000000 + Math.random() * 90000000)}`,
        role: "BUYER",
      },
    });

    // Create Category & Product
    testCategory = await prisma.category.create({
      data: {
        name: `Notif Test Category ${timestamp}`,
        isActive: true,
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: `Smart Sensor Hub ${timestamp}`,
        price: 500,
        stock: 25, // initial stock 25; will drop below 20 upon order of 10
        minOrderQuantity: 5,
        unit: "piece",
        businessId: sellerBusiness.id,
        categoryId: testCategory.id,
        isActive: true,
      },
    });
  });

  after(async () => {
    // Cleanup created test records
    await prisma.notification.deleteMany({
      where: {
        userId: { in: [buyerUser.id, sellerUser.id, otherUser.id] },
      },
    });
    await prisma.orderItem.deleteMany({
      where: { productId: testProduct.id },
    });
    await prisma.order.deleteMany({
      where: { buyerId: buyerUser.id },
    });
    await prisma.quotationMessage.deleteMany({
      where: { quotation: { buyerId: buyerUser.id } },
    });
    await prisma.quotation.deleteMany({
      where: { buyerId: buyerUser.id },
    });
    await prisma.product.deleteMany({
      where: { id: testProduct.id },
    });
    await prisma.category.deleteMany({
      where: { id: testCategory.id },
    });
    await prisma.business.deleteMany({
      where: { id: sellerBusiness.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [buyerUser.id, sellerUser.id, otherUser.id] } },
    });

    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  });

  it("1. Rejects notification fetch when x-user-id header is missing (HTTP 401)", async () => {
    const res = await apiRequest("/api/notifications");
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  it("2. Returns empty notifications list and 0 unread for new user", async () => {
    const res = await apiRequest("/api/notifications", {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.notifications.length, 0);
    assert.strictEqual(res.data.data.unreadCount, 0);
  });

  it("3. Unread count endpoint returns 0 for user with no notifications", async () => {
    const res = await apiRequest("/api/notifications/unread-count", {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.unreadCount, 0);
  });

  it("4. Automatically creates ORDER_PLACED and LOW_STOCK notifications when buyer places order", async () => {
    // Buyer places order for 10 units (stock 25 -> 15 <= 20 threshold, so LOW_STOCK triggers too!)
    const orderPayload = {
      items: [
        {
          productId: testProduct.id,
          quantity: 10,
          price: 500,
        },
      ],
      deliveryAddress: { street: "123 Trade Way", city: "Mumbai" },
      paymentMethod: "Trade Credit / RTGS / NEFT",
    };

    const orderRes = await apiRequest("/api/orders", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: orderPayload,
    });

    assert.strictEqual(orderRes.status, 201);
    const createdOrder = orderRes.data.data;
    assert.ok(createdOrder.id);

    // Verify Seller received ORDER_PLACED notification
    const sellerNotifsRes = await apiRequest("/api/notifications", {
      headers: { "x-user-id": sellerUser.id },
    });
    assert.strictEqual(sellerNotifsRes.status, 200);
    const sellerNotifs = sellerNotifsRes.data.data.notifications;

    const orderNotif = sellerNotifs.find((n) => n.type === "ORDER_PLACED");
    assert.ok(orderNotif, "Seller must receive ORDER_PLACED notification");
    assert.strictEqual(orderNotif.entityId, createdOrder.id);
    assert.strictEqual(orderNotif.isRead, false);

    // Verify Seller received LOW_STOCK notification (stock dropped from 25 to 15 <= 20)
    const lowStockNotif = sellerNotifs.find((n) => n.type === "LOW_STOCK");
    assert.ok(lowStockNotif, "Seller must receive LOW_STOCK alert");
    assert.strictEqual(lowStockNotif.entityId, testProduct.id);

    // Verify unread count matches notifications
    const countRes = await apiRequest("/api/notifications/unread-count", {
      headers: { "x-user-id": sellerUser.id },
    });
    assert.strictEqual(countRes.data.data.unreadCount >= 2, true);
  });

  it("5. Seller accepting order triggers ORDER_ACCEPTED notification to buyer", async () => {
    const ordersRes = await apiRequest("/api/orders", {
      headers: { "x-user-id": buyerUser.id },
    });
    const buyerOrder = ordersRes.data.data[0];
    assert.ok(buyerOrder);

    // Seller updates status to Processing (Accepted)
    const updateRes = await apiRequest(`/api/seller/orders/${buyerOrder.id}/status`, {
      method: "PUT",
      headers: {
        "x-user-id": sellerUser.id,
        "x-business-id": sellerBusiness.id,
      },
      body: { status: "Processing" },
    });
    assert.strictEqual(updateRes.status, 200);

    // Verify Buyer received ORDER_ACCEPTED notification
    const buyerNotifsRes = await apiRequest("/api/notifications", {
      headers: { "x-user-id": buyerUser.id },
    });
    const acceptedNotif = buyerNotifsRes.data.data.notifications.find(
      (n) => n.type === "ORDER_ACCEPTED" && n.entityId === buyerOrder.id
    );
    assert.ok(acceptedNotif, "Buyer must receive ORDER_ACCEPTED notification");
    assert.strictEqual(acceptedNotif.isRead, false);
  });

  it("6. Seller dispatching order triggers ORDER_DISPATCHED notification to buyer", async () => {
    const ordersRes = await apiRequest("/api/orders", {
      headers: { "x-user-id": buyerUser.id },
    });
    const buyerOrder = ordersRes.data.data[0];

    const dispatchRes = await apiRequest(`/api/seller/orders/${buyerOrder.id}/status`, {
      method: "PUT",
      headers: {
        "x-user-id": sellerUser.id,
        "x-business-id": sellerBusiness.id,
      },
      body: {
        status: "Dispatched",
        carrierName: "Blue Dart B2B",
        trackingNumber: "BD-998811",
      },
    });
    assert.strictEqual(dispatchRes.status, 200);

    const buyerNotifsRes = await apiRequest("/api/notifications", {
      headers: { "x-user-id": buyerUser.id },
    });
    const dispatchedNotif = buyerNotifsRes.data.data.notifications.find(
      (n) => n.type === "ORDER_DISPATCHED" && n.entityId === buyerOrder.id
    );
    assert.ok(dispatchedNotif, "Buyer must receive ORDER_DISPATCHED notification");
    assert.ok(dispatchedNotif.message.includes("Blue Dart B2B"));
  });

  it("7. Order delivery triggers ORDER_DELIVERED notification to buyer", async () => {
    const ordersRes = await apiRequest("/api/orders", {
      headers: { "x-user-id": buyerUser.id },
    });
    const buyerOrder = ordersRes.data.data[0];

    // Status transition: Dispatched -> Out for Delivery -> Delivered
    await apiRequest(`/api/seller/orders/${buyerOrder.id}/status`, {
      method: "PUT",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: { status: "Out for Delivery" },
    });

    const deliverRes = await apiRequest(`/api/seller/orders/${buyerOrder.id}/status`, {
      method: "PUT",
      headers: { "x-user-id": sellerUser.id, "x-business-id": sellerBusiness.id },
      body: { status: "Delivered" },
    });
    assert.strictEqual(deliverRes.status, 200);

    const buyerNotifsRes = await apiRequest("/api/notifications", {
      headers: { "x-user-id": buyerUser.id },
    });
    const deliveredNotif = buyerNotifsRes.data.data.notifications.find(
      (n) => n.type === "ORDER_DELIVERED" && n.entityId === buyerOrder.id
    );
    assert.ok(deliveredNotif, "Buyer must receive ORDER_DELIVERED notification");
  });

  it("8. Buyer quotation request triggers QUOTATION_REQUEST notification to seller", async () => {
    const quoteRes = await apiRequest("/api/quotations", {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
      body: {
        productId: testProduct.id,
        sellerBusinessId: sellerBusiness.id,
        requestedQuantity: 50,
        buyerTargetPrice: 420,
      },
    });
    assert.strictEqual(quoteRes.status, 201);
    const createdQuote = quoteRes.data.data;

    // Check seller notifications
    const sellerNotifs = await apiRequest("/api/notifications", {
      headers: { "x-user-id": sellerUser.id },
    });
    const rfqNotif = sellerNotifs.data.data.notifications.find(
      (n) => n.type === "QUOTATION_REQUEST" && n.entityId === createdQuote.id
    );
    assert.ok(rfqNotif, "Seller must receive QUOTATION_REQUEST notification");
  });

  it("9. Seller quotation counter-offer triggers QUOTATION_COUNTER notification to buyer", async () => {
    const quotesRes = await apiRequest("/api/quotations/buyer", {
      headers: { "x-user-id": buyerUser.id },
    });
    const quote = quotesRes.data.data[0];

    // Seller responds with counter-offer
    const respondRes = await apiRequest(`/api/quotations/${quote.id}/respond`, {
      method: "POST",
      headers: {
        "x-user-id": sellerUser.id,
        "x-business-id": sellerBusiness.id,
      },
      body: {
        type: "counter",
        quotedUnitPrice: 460,
        quotedQuantity: 50,
        sellerNotes: "Can offer ₹460 for batch of 50 units",
      },
    });
    assert.strictEqual(respondRes.status, 200);

    const buyerNotifs = await apiRequest("/api/notifications", {
      headers: { "x-user-id": buyerUser.id },
    });
    const counterNotif = buyerNotifs.data.data.notifications.find(
      (n) => n.type === "QUOTATION_COUNTER" && n.entityId === quote.id
    );
    assert.ok(counterNotif, "Buyer must receive QUOTATION_COUNTER notification");
  });

  it("10. Buyer accepting quotation triggers QUOTATION_ACCEPTED notification to seller", async () => {
    const quotesRes = await apiRequest("/api/quotations/buyer", {
      headers: { "x-user-id": buyerUser.id },
    });
    const quote = quotesRes.data.data[0];

    const acceptRes = await apiRequest(`/api/quotations/${quote.id}/accept`, {
      method: "POST",
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(acceptRes.status, 200);

    const sellerNotifs = await apiRequest("/api/notifications", {
      headers: { "x-user-id": sellerUser.id },
    });
    const acceptedNotif = sellerNotifs.data.data.notifications.find(
      (n) => n.type === "QUOTATION_ACCEPTED" && n.entityId === quote.id
    );
    assert.ok(acceptedNotif, "Seller must receive QUOTATION_ACCEPTED notification");
  });

  it("11. Marking single notification as read updates status and decrements unread count", async () => {
    const notifsRes = await apiRequest("/api/notifications", {
      headers: { "x-user-id": buyerUser.id },
    });
    const initialUnread = notifsRes.data.data.unreadCount;
    const targetNotif = notifsRes.data.data.notifications.find((n) => !n.isRead);
    assert.ok(targetNotif);

    const markRes = await apiRequest(`/api/notifications/${targetNotif.id}/read`, {
      method: "PATCH",
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(markRes.status, 200);
    assert.strictEqual(markRes.data.data.isRead, true);
    assert.ok(markRes.data.data.readAt);

    // Verify unread count decremented by 1
    const countRes = await apiRequest("/api/notifications/unread-count", {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(countRes.data.data.unreadCount, initialUnread - 1);
  });

  it("12. User CANNOT mark or delete another user's notification (HTTP 403 Forbidden)", async () => {
    const buyerNotifs = await apiRequest("/api/notifications", {
      headers: { "x-user-id": buyerUser.id },
    });
    const buyerNotif = buyerNotifs.data.data.notifications[0];
    assert.ok(buyerNotif);

    // Other user attempts to mark buyer's notification as read
    const hackReadRes = await apiRequest(`/api/notifications/${buyerNotif.id}/read`, {
      method: "PATCH",
      headers: { "x-user-id": otherUser.id },
    });
    assert.strictEqual(hackReadRes.status, 403);

    // Other user attempts to delete buyer's notification
    const hackDeleteRes = await apiRequest(`/api/notifications/${buyerNotif.id}`, {
      method: "DELETE",
      headers: { "x-user-id": otherUser.id },
    });
    assert.strictEqual(hackDeleteRes.status, 403);
  });

  it("13. Mark all as read sets all unread notifications to read and resets unread count to 0", async () => {
    const markAllRes = await apiRequest("/api/notifications/mark-all-read", {
      method: "PATCH",
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(markAllRes.status, 200);
    assert.strictEqual(markAllRes.data.success, true);

    const countRes = await apiRequest("/api/notifications/unread-count", {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(countRes.data.data.unreadCount, 0);

    const notifsRes = await apiRequest("/api/notifications?isRead=false", {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(notifsRes.data.data.notifications.length, 0);
  });

  it("14. Deleting a notification removes it from database", async () => {
    const notifsRes = await apiRequest("/api/notifications", {
      headers: { "x-user-id": buyerUser.id },
    });
    const target = notifsRes.data.data.notifications[0];
    assert.ok(target);

    const deleteRes = await apiRequest(`/api/notifications/${target.id}`, {
      method: "DELETE",
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.data.success, true);

    const checkRes = await apiRequest(`/api/notifications`, {
      headers: { "x-user-id": buyerUser.id },
    });
    assert.strictEqual(
      checkRes.data.data.notifications.some((n) => n.id === target.id),
      false
    );
  });
});
