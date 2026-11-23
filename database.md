# VyaparSetu — Database Architecture & Engineering Guide

This document provides a comprehensive, production-accurate guide to the database architecture, data models, entity relationships, integrity constraints, and query optimizations implemented in **VyaparSetu**.

---

## 1. Database Overview

VyaparSetu is a B2B wholesale trade and negotiation marketplace. The platform connects Indian MSMEs, manufacturers, and bulk buyers for wholesale purchasing, tiered volume pricing, custom quotation negotiations, order fulfillment, and operational alerts.

### 1.1 Technology Stack & Versions
- **Database Engine**: **PostgreSQL** (version 16+, tested on PostgreSQL 18.x)
- **Object-Relational Mapping (ORM)**: **Prisma ORM** (`^7.10.1` via `@prisma/client` and `prisma`)
- **Database Driver / Adapter**: `@prisma/adapter-pg` (`^7.10.1`) using native `pg` (`^8.23.1`) connection pooling
- **Node.js Runtime Requirement**: Node.js `v18+` or `v20+` (LTS recommended)
- **Primary Schema Definition**: `backend/prisma/schema.prisma`
- **Migration History**: Managed via Prisma Migrations in `backend/prisma/migrations/`

### 1.2 Connection Architecture
The backend connects to PostgreSQL through a centralized Prisma Client instance initialized in `backend/src/lib/prisma.js`:

```javascript
// backend/src/lib/prisma.js
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
```

#### Key Architecture Highlights:
1. **Connection Pooling**: The `@prisma/adapter-pg` driver maintains a pool of reusable TCP connections to PostgreSQL, preventing the costly overhead of establishing new connections on each incoming HTTP request.
2. **Lifecycle Management**: The database connection is explicitly verified on application startup in `backend/src/server.js` via `prisma.$connect()`. In the event of a fatal server shutdown, `prisma.$disconnect()` is called to cleanly close open database connections.
3. **Environment Isolation**: Database credentials, hosts, and ports are read at runtime from environment variables (`DATABASE_URL`), ensuring zero credentials are hardcoded into application source files.

---

## 2. Database Models (All 12 Models)

The VyaparSetu schema consists of **12 relational models** organized into logical business domains: Identity, Master Catalog, Shopping Cart, Orders, Quotations, and Notifications.

```
+-----------------------------------------------------------------------------------+
|                               VYAPARSETU DOMAINS                                  |
+--------------------+---------------------+--------------------+-------------------+
|  Identity & Org    |   Master Catalog    |   Cart & Orders    |   Negotiations    |
+--------------------+---------------------+--------------------+-------------------+
| - User             | - Category          | - Cart             | - Quotation       |
| - Business         | - Product           | - CartItem         | - QuotationMessage|
|                    | - BulkPricing       | - Order            |                   |
|                    |                     | - OrderItem        | - Notification    |
+--------------------+---------------------+--------------------+-------------------+
```

---

### 2.1 Model: `User`
* **Purpose**: Core identity and authentication record for platform users (Buyers, Sellers, Both, and Admins).
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 16–32)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `name` | `String` | `@default("Guest Buyer")` | Full name of the user. |
| `email` | `String?` | `@unique`, Optional | Verified email address for login. |
| `passwordHash` | `String?` | Optional | Bcrypt hashed password. |
| `phone` | `String?` | `@unique`, Optional | Mobile contact number for OTP login. |
| `role` | `UserRole` | `@default(BUYER)` | Role enum: `BUYER`, `SELLER`, `BOTH`, `ADMIN`. |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Automatic update timestamp. |

---

### 2.2 Model: `Business`
* **Purpose**: Verified wholesale business profile representing seller organizations.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 34–54)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `name` | `String` | Required | Registered legal or trade name of the business. |
| `description` | `String?` | Optional | Business background or catalog overview. |
| `category` | `String?` | Optional | Primary business trade category. |
| `address` | `String?` | Optional | Warehouse / office street address. |
| `city` | `String?` | Optional | Operating city. |
| `state` | `String?` | Optional | Operating state. |
| `pincode` | `String?` | Optional | 6-digit postal code. |
| `phone` | `String?` | Optional | Official business support number. |
| `email` | `String?` | Optional | Official business communication email. |
| `ownerId` | `String` | `@unique`, FK $\to$ `User.id` | Single-owner reference constraint. |
| `createdAt` | `DateTime` | `@default(now())` | Registration timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Profile update timestamp. |

---

### 2.3 Model: `Category`
* **Purpose**: Master product categorization taxonomy for indexing, browsing, and discovery.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 56–67)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `name` | `String` | `@unique` | Unique category name (e.g., Textiles, Electronics). |
| `description` | `String?` | Optional | Informative description of category scope. |
| `imageUrl` | `String?` | Optional | Category display banner / icon URL. |
| `isActive` | `Boolean` | `@default(true)` | Active toggle for catalog filtering. |
| `createdAt` | `DateTime` | `@default(now())` | Category creation timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Category update timestamp. |

---

### 2.4 Model: `Product`
* **Purpose**: Wholesale catalog Stock Keeping Unit (SKU) record with inventory, pricing, and MOQ.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 69–104)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `name` | `String` | Required | Product display name. |
| `description` | `String?` | Optional | Technical specifications, packaging info. |
| `price` | `Decimal` | `@db.Decimal(10, 2)` | Standard wholesale base price per unit. |
| `stock` | `Int` | `@default(0)` | Current available live warehouse stock. |
| `minOrderQuantity` | `Int` | `@default(1)` | Minimum Order Quantity (MOQ) required to purchase. |
| `unit` | `String` | `@default("piece")` | Unit of measure (e.g., piece, kg, box, metre). |
| `imageUrl` | `String?` | Optional | Primary product image URL. |
| `isActive` | `Boolean` | `@default(true)` | Listing visibility toggle. |
| `isFeatured` | `Boolean` | `@default(false)` | Flag indicating homepage featured ranking. |
| `isSurplus` | `Boolean` | `@default(false)` | Flag indicating discounted surplus clearance inventory. |
| `surplusQuantity` | `Int` | `@default(0)` | Units allocated specifically for surplus sale. |
| `surplusPrice` | `Decimal?` | `@db.Decimal(10, 2)` | Discounted surplus unit price. |
| `surplusDeadline` | `DateTime?` | Optional | Expiration cutoff date for surplus liquidation. |
| `businessId` | `String` | FK $\to$ `Business.id` | Seller business offering the product. |
| `categoryId` | `String` | FK $\to$ `Category.id` | Category classification. |
| `createdAt` | `DateTime` | `@default(now())` | SKU creation timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | SKU update timestamp. |

---

### 2.5 Model: `BulkPricing`
* **Purpose**: Wholesale tiered volume discount matrix for products (e.g., 20–49 units @ ₹180, 50+ units @ ₹160).
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 106–120)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `minQuantity` | `Int` | Required | Minimum threshold quantity for tier discount. |
| `maxQuantity` | `Int?` | Optional | Upper limit for tier (NULL indicates infinity / and above). |
| `pricePerUnit` | `Decimal` | `@db.Decimal(10, 2)` | Discounted unit price applied within this tier. |
| `productId` | `String` | FK $\to$ `Product.id` | Identifying parent product. |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Record update timestamp. |

---

### 2.6 Model: `Cart`
* **Purpose**: Active shopping cart container allocated to a buyer.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 122–131)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `userId` | `String` | `@unique`, FK $\to$ `User.id` | Owning buyer user reference. |
| `createdAt` | `DateTime` | `@default(now())` | Cart session creation timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Last modification timestamp. |

---

### 2.7 Model: `CartItem`
* **Purpose**: **Junction table** representing line items staging in a buyer's cart.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 133–146)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `cartId` | `String` | FK $\to$ `Cart.id` | Target shopping cart. |
| `productId` | `String` | FK $\to$ `Product.id` | Selected catalog SKU. |
| `quantity` | `Int` | `@default(1)` | Desired purchase quantity. |
| `createdAt` | `DateTime` | `@default(now())` | Added-to-cart timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Quantity update timestamp. |

---

### 2.8 Model: `Order`
* **Purpose**: Legally binding purchase order header recording transactional summary and state.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 148–181)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `orderNumber` | `String` | `@unique` | Human-readable tracking number (e.g., `VS-MWHAM7W0-1779`). |
| `buyerId` | `String` | FK $\to$ `User.id` | Buyer who placed the order. |
| `status` | `String` | `@default("Confirmed")` | Lifecycle state: `Confirmed`, `Processing`, `Dispatched`, `Delivered`, `Cancelled`, `Rejected`. |
| `subtotal` | `Decimal` | `@db.Decimal(12, 2)` | Net subtotal amount before discounts. |
| `totalSavings` | `Decimal` | `@default(0) @db.Decimal(12, 2)` | Total monetary savings from wholesale tier discounts. |
| `totalAmount` | `Decimal` | `@db.Decimal(12, 2)` | Final invoice payable amount. |
| `totalUnits` | `Int` | `@default(1)` | Sum of all unit quantities across items. |
| `deliveryAddress` | `Json?` | Optional, PostgreSQL `JSONB` | Point-in-time shipping address snapshot document. |
| `paymentMethod` | `String` | `@default("Trade Credit / RTGS / NEFT")` | Terms of payment. |
| `notes` | `String?` | Optional | Special instructions from the buyer. |
| `rejectionReason` | `String?` | Optional | Recorded reason if rejected by seller. |
| `cancellationReason` | `String?` | Optional | Recorded reason if cancelled. |
| `quotationId` | `String?` | `@unique`, FK $\to$ `Quotation.id` | Optional origin quotation reference (1:1 conversion). |
| `carrierName` | `String?` | Optional | Logistics carrier name (e.g., Delhivery, BlueDart). |
| `trackingNumber` | `String?` | Optional | Waybill / consignment tracking number. |
| `acceptedAt` | `DateTime?` | Optional | Timestamp when seller acknowledged order. |
| `dispatchedAt` | `DateTime?` | Optional | Timestamp when logistics pickup completed. |
| `deliveredAt` | `DateTime?` | Optional | Timestamp when delivery confirmed. |
| `cancelledAt` | `DateTime?` | Optional | Timestamp when order was cancelled. |
| `rejectedAt` | `DateTime?` | Optional | Timestamp when order was rejected. |
| `createdAt` | `DateTime` | `@default(now())` | Checkout timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Status change timestamp. |

---

### 2.9 Model: `OrderItem`
* **Purpose**: **Junction table** capturing historical line items with immutable pricing and vendor snapshots.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 183–206)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `orderId` | `String` | FK $\to$ `Order.id` | Associated parent purchase order. |
| `productId` | `String?` | Nullable, FK $\to$ `Product.id` | Reference to product SKU (set to NULL on SKU deletion). |
| `productName` | `String` | Required | **Snapshot**: Name of product at time of checkout. |
| `quantity` | `Int` | `@default(1)` | Units purchased. |
| `unitPrice` | `Decimal` | `@db.Decimal(10, 2)` | **Snapshot**: Unit price agreed at checkout. |
| `itemTotal` | `Decimal` | `@db.Decimal(12, 2)` | Total line amount (`quantity * unitPrice`). |
| `savings` | `Decimal` | `@default(0) @db.Decimal(10, 2)` | Tier discount savings on this specific line item. |
| `unit` | `String` | `@default("piece")` | Unit of measure snapshot. |
| `businessId` | `String?` | Optional | **Snapshot**: Seller business UUID. |
| `businessName` | `String?` | Optional | **Snapshot**: Seller trade name. |
| `quotationId` | `String?` | Optional | Linked quotation UUID if converted from RFQ. |
| `activeTier` | `Json?` | Optional, PostgreSQL `JSONB` | **Snapshot**: Bulk pricing tier details `{ min, max, price }`. |
| `createdAt` | `DateTime` | `@default(now())` | Order placement timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Update timestamp. |

---

### 2.10 Model: `Quotation`
* **Purpose**: B2B Request for Quotation (RFQ) document managing multi-round price and volume negotiation.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 208–251)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `quotationNumber` | `String` | `@unique` | Human-readable RFQ identifier. |
| `buyerId` | `String` | FK $\to$ `User.id` | Requesting buyer user. |
| `sellerBusinessId`| `String` | FK $\to$ `Business.id` | Target seller business organization. |
| `productId` | `String?` | Nullable, FK $\to$ `Product.id` | Target product SKU. |
| `productSnapshot` | `Json?` | Optional, PostgreSQL `JSONB` | **Snapshot**: Full product specifications at RFQ submission. |
| `buyerInfo` | `Json?` | Optional, PostgreSQL `JSONB` | **Snapshot**: Buyer contact and business profile details. |
| `status` | `String` | `@default("Submitted")` | State: `Submitted`, `Quotation Provided`, `Counter-Offer Made`, `Accepted`, `Rejected by Seller`, `Rejected by Buyer`, `Ordered`. |
| `requestedQuantity`| `Int` | Required | Total bulk units requested by buyer. |
| `buyerTargetPrice`| `Decimal?`| `@db.Decimal(10, 2)` | Initial target unit price proposed by buyer. |
| `deliveryAddress` | `Json?` | Optional, PostgreSQL `JSONB` | Delivery location details proposed during negotiation. |
| `quotedUnitPrice` | `Decimal?`| `@db.Decimal(10, 2)` | Final agreed or countered unit price by seller. |
| `quotedQuantity` | `Int?` | Optional | Countered quantity proposed by seller. |
| `quotedTotalAmount`| `Decimal?`| `@db.Decimal(12, 2)` | Quoted total transaction value. |
| `validityDays` | `Int?` | `@default(14)` | Duration in days for which quotation terms remain valid. |
| `validUntil` | `DateTime?`| Optional | Expiration cutoff timestamp for acceptance. |
| `isCounterOffer` | `Boolean` | `@default(false)` | Flag indicating active counter-proposal pending response. |
| `createdAt` | `DateTime` | `@default(now())` | RFQ submission timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Last negotiation update timestamp. |

---

### 2.11 Model: `QuotationMessage`
* **Purpose**: Chronological audit trail and conversation log recording negotiation rounds, counter-offers, and notes.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 253–266)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `quotationId` | `String` | FK $\to$ `Quotation.id` | Associated parent negotiation thread. |
| `senderId` | `String` | Required | User UUID of the participant posting the message. |
| `senderRole` | `String` | Required | Role indicator: `"BUYER"` or `"SELLER"`. |
| `action` | `String` | Required | Action verb: `OFFER`, `COUNTER`, `ACCEPT`, `REJECT`, `CONVERT_TO_ORDER`. |
| `price` | `Decimal?` | `@db.Decimal(10, 2)` | Proposed unit price in this round. |
| `quantity` | `Int?` | Optional | Proposed quantity in this round. |
| `notes` | `String?` | Optional | Text message or commercial terms attached to offer. |
| `createdAt` | `DateTime` | `@default(now())` | Message posting timestamp. |

---

### 2.12 Model: `Notification`
* **Purpose**: In-app push notification feed alerting buyers and sellers of order state changes, negotiations, and low stock.
* **Location in Schema**: `backend/prisma/schema.prisma` (lines 268–286)

| Field | Data Type | Modifiers / Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | Primary key (UUID v4). |
| `userId` | `String` | FK $\to$ `User.id` | Recipient user UUID. |
| `title` | `String` | Required | Brief summary alert title. |
| `message` | `String` | Required | Explanatory notification body text. |
| `type` | `String` | Required | Event category (e.g., `ORDER_PLACED`, `ORDER_ACCEPTED`, `LOW_STOCK`, `QUOTATION_RECEIVED`). |
| `entityId` | `String?` | Optional | Referenced entity UUID (`orderId`, `quotationId`, `productId`). |
| `entityType` | `String?` | Optional | Entity classification (`ORDER`, `QUOTATION`, `PRODUCT`). |
| `isRead` | `Boolean` | `@default(false)` | Status flag tracking whether user has opened notification. |
| `readAt` | `DateTime?`| Optional | Timestamp when marked as read. |
| `metadata` | `Json?` | Optional, PostgreSQL `JSONB` | Supplementary structured JSON payload for navigation. |
| `createdAt` | `DateTime` | `@default(now())` | Alert delivery timestamp. |
| `updatedAt` | `DateTime` | `@updatedAt` | Status change timestamp. |

---

## 3. Entity Relationships

VyaparSetu connects its 12 models through strict relational associations. Below is the comprehensive relationship map.

### 3.1 Relationship Summary Table

| Source Model | Target Model | Relationship Type | Foreign Key Column | Delete Action (`onDelete`) | Business Rule & Description |
|---|---|---|---|---|---|
| `User` | `Business` | **One-to-One (Optional)** | `Business.ownerId` | `Cascade` | In `schema.prisma`, `User.business` is `Business?`. A user can own at most one business ($1 \to 0..1$). Pure buyers do not have a business. |
| `User` | `Cart` | **One-to-One (Optional)** | `Cart.userId` | `Cascade` | In `schema.prisma`, `User.cart` is `Cart?`. A user has zero or one active cart ($1 \to 0..1$), created when the user initiates a cart session. |
| `User` | `Order` | **One-to-Many** | `Order.buyerId` | `Cascade` | One buyer places multiple orders over their account lifetime. |
| `User` | `Quotation` | **One-to-Many** | `Quotation.buyerId` | `Cascade` | One buyer can submit multiple RFQs across different sellers. |
| `User` | `Notification`| **One-to-Many** | `Notification.userId` | `Cascade` | One user receives multiple operational alerts. |
| `Business` | `Product` | **One-to-Many** | `Product.businessId` | `Cascade` | One business offers multiple wholesale catalog SKUs. |
| `Business` | `Quotation` | **One-to-Many** | `Quotation.sellerBusinessId` | `Cascade` | One seller business receives multiple quotation requests. |
| `Category` | `Product` | **One-to-Many** | `Product.categoryId` | `Restrict` | A category classifies multiple products; deletion is blocked if any referencing product exists. |
| `Product` | `BulkPricing` | **One-to-Many** | `BulkPricing.productId` | `Cascade` | A product defines multiple tiered volume price brackets. |
| `Product` | `CartItem` | **One-to-Many** | `CartItem.productId` | `Cascade` | A product can be referenced by items in active carts. |
| `Product` | `OrderItem` | **One-to-Many** | `OrderItem.productId` | `SetNull` | A product is referenced by historical orders; becomes NULL on product deletion. |
| `Product` | `Quotation` | **One-to-Many** | `Quotation.productId` | `SetNull` | A product is referenced by quotations; becomes NULL on product deletion. |
| `Cart` | `CartItem` | **One-to-Many** | `CartItem.cartId` | `Cascade` | A cart contains multiple line items. |
| `Order` | `OrderItem` | **One-to-Many** | `OrderItem.orderId` | `Cascade` | An order is composed of multiple line items. |
| `Quotation` | `Order` | **One-to-One (Optional)** | `Order.quotationId` | `SetNull` | An accepted quotation converts 1:1 into an order. |
| `Quotation` | `QuotationMessage` | **One-to-Many** | `QuotationMessage.quotationId` | `Cascade` | A quotation thread contains multiple negotiation messages. |

---

### 3.2 Junction Tables: How Many-to-Many Relationships Are Resolved

In relational databases, Many-to-Many ($M:N$) relationships cannot be modeled directly with single foreign key columns. VyaparSetu resolves two major Many-to-Many relationships using explicit **Junction Tables**:

#### 1. Cart $\longleftrightarrow$ Product ($M:N$) via `CartItem`
- **Structure**:
  ```
  [Cart] (1) <---> (N) [CartItem] (N) <---> (1) [Product]
  ```
- **Constraint**: `CartItem` enforces a compound unique constraint:
  ```prisma
  @@unique([cartId, productId])
  ```
  This ensures a buyer cannot have two separate rows for the exact same product in their cart. When quantity is adjusted, the existing row's `quantity` column is updated.

#### 2. Order $\longleftrightarrow$ Product ($M:N$) via `OrderItem`
- **Structure**:
  ```
  [Order] (1) <---> (N) [OrderItem] (N) <---> (1) [Product]
  ```
- **Attributes on the Junction**: Unlike pure link tables that only contain IDs, `OrderItem` carries rich snapshot attributes: `quantity`, `unitPrice`, `itemTotal`, `savings`, `businessName`, and `activeTier`.

---

## 4. Primary Keys and Foreign Keys

### 4.1 Primary Key Strategy
All 12 models in VyaparSetu use **Universally Unique Identifiers (UUID v4)** as their primary keys:
```prisma
id String @id @default(uuid())
```

#### Rationale and Architectural Boundaries:
1. **Security Against Enumeration**: Auto-incrementing IDs (`1, 2, 3...`) expose predictable patterns. An external observer could deduce total order or user volume from sequential IDs. UUIDs obscure predictable IDs and prevent sequential enumeration attacks (`/orders/1`, `/orders/2`).
2. **UUIDs Do Not Replace API Authorization**: While UUIDs make IDs unpredictable, **they are an identifier format, not an access control mechanism**. They do NOT replace server-side authentication and authorization checks. Every API endpoint in VyaparSetu explicitly validates user ownership (e.g. verifying `order.buyerId === requestingUserId` or checking seller business permissions in `order.service.js`).
3. **Distributed ID Generation**: UUIDs can be safely generated on the client, backend server, or database layer without risk of collision or coordination bottlenecks across database shards.

### 4.2 Foreign Key Implementation
Foreign keys are explicitly defined in the Prisma schema using the `@relation` directive. For example, connecting `Product` to its owning `Business`:
```prisma
businessId String
business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
```
In PostgreSQL migrations, this generates a physical foreign key constraint:
```sql
CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") 
REFERENCES "Business"("id") ON UPDATE CASCADE ON DELETE CASCADE
```

---

## 5. Constraints and Referential Actions

### 5.1 Unique Constraints
Unique constraints enforce business rules directly at the database engine level, preventing data duplication even under concurrent requests:

| Constraint Name | Target Columns | Purpose |
|---|---|---|
| `User_email_key` | `User(email)` | Prevents duplicate user accounts sharing the same email. |
| `User_phone_key` | `User(phone)` | Ensures mobile numbers are unique across registered accounts. |
| `Business_ownerId_key` | `Business(ownerId)` | Enforces the rule that one user can own at most one business. |
| `Category_name_key` | `Category(name)` | Prevents duplicate product category classifications. |
| `Order_orderNumber_key` | `Order(orderNumber)` | Guarantees uniqueness of human-readable tracking identifiers. |
| `Order_quotationId_key` | `Order(quotationId)` | Guarantees an accepted quotation can only be converted into an order once. |
| `Quotation_quotationNumber_key` | `Quotation(quotationNumber)` | Guarantees uniqueness of RFQ reference numbers. |
| `Cart_userId_key` | `Cart(userId)` | Guarantees each buyer possesses at most one active cart. |
| `CartItem_cartId_productId_key` | `CartItem(cartId, productId)` | Compound unique constraint preventing duplicate item rows in the same cart. |

---

### 5.2 Referential Actions (`onDelete`)

VyaparSetu applies three distinct referential integrity delete actions depending on the commercial lifecycle of each entity:

```
+--------------------------------------------------------------------------------+
|                         REFERENTIAL ACTION STRATEGY                            |
+--------------------------------------------------------------------------------+
|  CASCADE          | Deleting parent automatically deletes dependent child rows |
|  RESTRICT         | Halts deletion of parent if referenced by any child row    |
|  SET NULL         | Deleting parent sets child foreign key to NULL (retains row)|
+--------------------------------------------------------------------------------+
```

#### 1. `onDelete: Cascade` (Dependent Child Records)
* **Rule**: When the parent record is deleted, all dependent child rows are deleted automatically.
* **Examples in VyaparSetu**:
  - `Business` $\to$ `User`: Deleting a user account cascades to wipe their business profile.
  - `Product` $\to$ `Business`: Deleting a seller business deletes all its catalog products.
  - `BulkPricing` $\to$ `Product`: Deleting a product SKU automatically cleans up its tiered pricing brackets.
  - `CartItem` $\to$ `Cart`: Clearing or removing a cart automatically purges its line items.
  - `QuotationMessage` $\to$ `Quotation`: Deleting an RFQ cleans up its conversation history.

#### 2. `onDelete: Restrict` (Hierarchy Protection)
* **Rule**: PostgreSQL blocks the deletion of a parent record if **any** child record references it, raising a foreign key constraint violation error (`23503 foreign_key_violation`).
* **Example in VyaparSetu**:
  ```prisma
  // Product model
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  ```
* **Accurate Behavior**: Deletion of a `Category` row is rejected if **any referencing product exists in the database**, regardless of whether that product's `isActive` flag is `true` or `false`. PostgreSQL's relational engine enforces foreign key constraints solely based on row presence; it does not evaluate application-level status flags.

#### 3. `onDelete: SetNull` (Audit Trail & Historical Financial Preservation)
* **Rule**: When the parent entity is deleted, PostgreSQL sets the foreign key in referencing rows to `NULL`. The referencing rows remain in the table.
* **Examples in VyaparSetu**:
  ```prisma
  // OrderItem model
  productId String?
  product   Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  // Quotation model
  productId String?
  product   Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  // Order model
  quotationId String? @unique
  quotation   Quotation? @relation("OrderQuotation", fields: [quotationId], references: [id], onDelete: SetNull)
  ```
* **Why This is Essential**: In an e-commerce platform, sellers eventually discontinue and delete catalog products. If `OrderItem` used `Cascade`, deleting an old product SKU would delete past buyer purchase orders, corrupting financial reports and tax records. If it used `Restrict`, sellers could never delete obsolete products that were once ordered. With `SetNull`, the foreign key becomes `NULL`, while all historical invoice data (`productName`, `unitPrice`, `itemTotal`) remains permanently intact.

---

## 6. Normalization and Denormalization

### 6.1 Separation of Concerns Across Master Models
VyaparSetu structures its master data into distinct, specialized models to avoid data redundancy in operational records:
- **Identity separation**: `User` contains authentication fields, while `Business` contains merchant metadata (GSTIN, warehouse city, state, pincode). Users who act only as buyers do not carry empty business fields.
- **Taxonomy separation**: `Category` maintains category names and banners independently. Catalog `Product` rows reference `categoryId` via a foreign key, preventing the repetition of category descriptions across thousands of product rows.
- **Pricing separation**: `BulkPricing` isolates volume-tiered pricing brackets from the base `Product` table, allowing dynamic tier matrices without altering the product table schema.

---

### 6.2 Pragmatic Denormalization: Historical Order Snapshots
While master tables avoid duplicate data, **transactional models (`OrderItem` and `Quotation`) deliberately duplicate specific fields at the time of creation**:

```prisma
model OrderItem {
  id           String   @id @default(uuid())
  orderId      String
  productId    String?  // Nullable reference
  
  // Denormalized Historical Snapshot Fields:
  productName  String
  quantity     Int      @default(1)
  unitPrice    Decimal  @db.Decimal(10, 2)
  itemTotal    Decimal  @db.Decimal(12, 2)
  savings      Decimal  @default(0) @db.Decimal(10, 2)
  unit         String   @default("piece")
  businessId   String?
  businessName String?
  activeTier   Json?
  ...
}
```

#### Why `OrderItem` Duplicates Catalog Attributes:
1. **Contractual Immutability**: Catalog data is mutable, but commercial invoices are legally immutable contracts. A seller can change their catalog product price from ₹200 to ₹350 next month, or edit the product title. If `OrderItem` joined with the `Product` table dynamically to fetch the name and price, viewing an order placed six months ago would calculate the invoice with the *current* catalog price and title, corrupting accounting and causing commercial disputes.
2. **Deletion Resilience**: Because `OrderItem` holds an exact copy of `productName`, `unitPrice`, and `businessName`, the buyer's order history and invoice PDF generator function accurately even after the seller deletes the original `Product` record (`productId = NULL`).
3. **Multi-Vendor Invoice Efficiency**: A single purchase order can contain line items from multiple different seller businesses. Storing `businessName` directly on the item eliminates the need to join both `Product` and `Business` tables during invoice rendering.

### 6.3 Use of PostgreSQL `JSONB` Columns
While declared as `Json?` in `backend/prisma/schema.prisma`, **the actual PostgreSQL migrations explicitly generate `JSONB` columns** (`"deliveryAddress" JSONB`, `"activeTier" JSONB`, `"productSnapshot" JSONB`, `"metadata" JSONB`):
- `Order.deliveryAddress`: Captures the buyer's shipping address at the moment of checkout. If the buyer edits their address in their user profile later, past order delivery destinations remain unaltered.
- `OrderItem.activeTier`: Captures the exact bulk discount matrix tier `{ minQuantity, maxQuantity, pricePerUnit }` that qualified the order item for a discount.
- `Quotation.productSnapshot`: Preserves the full product description, base price, and specifications at the moment an RFQ was created.

---

## 7. Indexes and Query Optimization

To accelerate query execution and avoid sequential table scans on read paths, VyaparSetu defines **23 explicit B-Tree indexes** across its models in `backend/prisma/schema.prisma`.

### 7.1 Complete Index Catalog (All 23 Explicit Indexes)

Below is the complete count and catalog of all **23 explicit `@@index` directives** defined in the Prisma schema:

| # | Model | Index Directive | Index Type | Target Columns | Primary Use Case / Beneficiary Query |
|---|---|---|---|---|---|
| 1 | `Product` | `@@index([businessId])` | Single B-Tree | `businessId` | Seller catalog management (`GET /api/seller/products`). |
| 2 | `Product` | `@@index([categoryId])` | Single B-Tree | `categoryId` | Filtering products by category (`GET /api/products?category=...`). |
| 3 | `Product` | `@@index([name])` | Single B-Tree | `name` | Catalog search filtering by product name prefix. |
| 4 | `Product` | `@@index([isActive, isFeatured])` | **Composite B-Tree** | `isActive, isFeatured` | Mobile home screen query fetching active featured products. |
| 5 | `Product` | `@@index([isSurplus])` | Single B-Tree | `isSurplus` | Filtering discounted surplus clearance inventory. |
| 6 | `BulkPricing` | `@@index([productId])` | Single B-Tree | `productId` | Joining volume discount brackets during catalog and cart calculations. |
| 7 | `Cart` | `@@index([userId])` | Single B-Tree | `userId` | Fetching active cart by buyer user UUID. |
| 8 | `CartItem` | `@@index([cartId])` | Single B-Tree | `cartId` | Loading all line items belonging to a specific cart. |
| 9 | `CartItem` | `@@index([productId])` | Single B-Tree | `productId` | Verifying if a product is currently staged in carts. |
| 10 | `Order` | `@@index([buyerId])` | Single B-Tree | `buyerId` | Buyer order history dashboard (`GET /api/orders`). |
| 11 | `Order` | `@@index([status])` | Single B-Tree | `status` | Filtering orders by fulfillment status (`Confirmed`, `Processing`). |
| 12 | `Order` | `@@index([orderNumber])` | Single B-Tree | `orderNumber` | Direct order lookup by human-readable reference number. *(Redundant with unique index)* |
| 13 | `OrderItem` | `@@index([orderId])` | Single B-Tree | `orderId` | Eager-loading line items for an order invoice. |
| 14 | `OrderItem` | `@@index([productId])` | Single B-Tree | `productId` | Tracking historical orders associated with a product SKU. |
| 15 | `OrderItem` | `@@index([businessId])` | Single B-Tree | `businessId` | Seller incoming orders dashboard filtering by vendor UUID. |
| 16 | `Quotation` | `@@index([buyerId])` | Single B-Tree | `buyerId` | Buyer quotation history dashboard. |
| 17 | `Quotation` | `@@index([sellerBusinessId])` | Single B-Tree | `sellerBusinessId` | Seller incoming RFQ dashboard. |
| 18 | `Quotation` | `@@index([productId])` | Single B-Tree | `productId` | Tracking quotations requested for a specific product SKU. |
| 19 | `Quotation` | `@@index([status])` | Single B-Tree | `status` | Filtering quotations by negotiation status (`Submitted`, `Accepted`). |
| 20 | `QuotationMessage` | `@@index([quotationId])` | Single B-Tree | `quotationId` | Loading chronological negotiation conversation threads. |
| 21 | `Notification` | `@@index([userId])` | Single B-Tree | `userId` | Loading recipient's notification history feed. |
| 22 | `Notification` | `@@index([userId, isRead])` | **Composite B-Tree** | `userId, isRead` | High-frequency unread badge counter (`WHERE userId = $1 AND isRead = false`). |
| 23 | `Notification` | `@@index([createdAt])` | Single B-Tree | `createdAt` | Ordering notification feeds chronologically. |

*(Note: In addition to these 23 explicit `@@index` directives, PostgreSQL maintains unique B-Tree indexes for all `@unique` constraints and primary keys).*

---

### 7.2 Key Composite Indexes Explained

#### 1. `Product(isActive, isFeatured)`
When buyers load the mobile app home screen, the query filters for active listings that are flagged as featured:
```sql
SELECT * FROM "Product" WHERE "isActive" = true AND "isFeatured" = true;
```
By indexing `(isActive, isFeatured)` together, PostgreSQL performs a direct **Bitmap Index Scan** on `Product_isActive_isFeatured_idx`. This avoids evaluating filter conditions across every unindexed row in the table.

#### 2. `Notification(userId, isRead)`
The mobile application periodically polls `GET /api/notifications/unread-count` to display the badge count on the notification bell:
```sql
SELECT COUNT(*) FROM "Notification" WHERE "userId" = $1 AND "isRead" = false;
```
Because of the composite index on `(userId, isRead)`, PostgreSQL traverses the B-Tree index leaf pages directly, filtering by both recipient and read state without reading entire notification row bodies from heap disk pages.

---

### 7.3 Codebase Audit Finding: Redundant Index on `Order(orderNumber)`
In `backend/prisma/schema.prisma` lines 150 & 180:
```prisma
model Order {
  id          String   @id @default(uuid())
  orderNumber String   @unique      // Automatically creates unique index "Order_orderNumber_key"
  ...
  @@index([orderNumber])             // Creates duplicate non-unique index "Order_orderNumber_idx"
}
```
* **Analysis**: PostgreSQL automatically creates a unique B-Tree index for every column marked with `@unique`. Declaring an explicit `@@index([orderNumber])` causes PostgreSQL to maintain **two duplicate B-Tree indexes** on the exact same column.
* **Impact**: Wastes disk space and doubles the index write overhead on every order checkout.
* **Optimization**: The duplicate `@@index([orderNumber])` can be safely removed in a future migration without affecting query performance.

---

### 7.4 Selective Field Retrieval (Avoiding `SELECT *`)
In `backend/src/services/product.service.js` (lines 23–75), queries use explicit Prisma `select` projections (`PRODUCT_DETAIL_SELECT`) rather than reading all table columns. This reduces network serialization overhead and memory footprint between PostgreSQL and the Node.js API server:

```javascript
// backend/src/services/product.service.js
const PRODUCT_DETAIL_SELECT = {
  id: true,
  name: true,
  price: true,
  stock: true,
  minOrderQuantity: true,
  unit: true,
  category: {
    select: { id: true, name: true }
  },
  business: {
    select: { id: true, name: true, city: true }
  },
  bulkPricing: {
    select: { minQuantity: true, maxQuantity: true, pricePerUnit: true },
    orderBy: { minQuantity: "asc" }
  }
};
```

---

## 8. Transactions and Data Integrity

### 8.1 The Atomic Checkout Transaction
When a buyer places a wholesale order, multiple interdependent database updates must occur simultaneously. VyaparSetu executes this workflow inside an interactive PostgreSQL transaction (`prisma.$transaction`) in `backend/src/services/order.service.js` (lines 352–502):

```
+--------------------------------------------------------------------------------+
|                     PRISMA.$TRANSACTION CHECKOUT WORKFLOW                      |
+--------------------------------------------------------------------------------+
|  1. Insert Order & OrderItems   --> Creates order header & child snapshot rows |
|  2. Decrement Product Stock     --> Atomic database update: stock - qty        |
|  3. Check Low-Stock Alert       --> Dispatches notification if stock <= 20     |
|  4. Update Quotation Status     --> Transitions RFQ status to 'Ordered'        |
|  5. Clear Buyer Cart            --> Purges CartItem records for buyer          |
|  6. Notify Seller Vendors       --> Dispatches ORDER_PLACED notifications      |
|                                                                                |
|  * IF CRITICAL WRITE FAILS: Entire sequence ROLLS BACK (No orphan data)       |
+--------------------------------------------------------------------------------+
```

#### Detailed Transaction Steps:
1. **Order & Line Item Creation** (lines 354–391):
   Inserts the `Order` record and all nested `OrderItem` child rows in a single write operation using Prisma's nested create syntax.
2. **Atomic Inventory Decrement** (lines 394–404):
   Iterates through each purchased product and decrements stock in PostgreSQL:
   ```javascript
   await tx.product.update({
     where: { id: item.productId },
     data: {
       stock: {
         decrement: item.quantity,
       },
     },
   });
   ```
3. **Automated Low-Stock Alert** (lines 406–431):
   If remaining stock drops below 20 units or below the product's Minimum Order Quantity (MOQ), a `LOW_STOCK` notification is dispatched to the seller business owner using the transaction handle `tx`.
4. **Quotation Conversion** (lines 436–457):
   If the order originated from an accepted quotation, the quotation status is updated to `"Ordered"` and a timestamped audit record is appended to `QuotationMessage`.
5. **Buyer Cart Purge** (lines 460–466):
   Deletes all items from the buyer's active cart:
   ```javascript
   await tx.cartItem.deleteMany({
     where: { cart: { userId: userId.trim() } },
   });
   ```
6. **Seller Notification** (lines 469–499):
   Creates `ORDER_PLACED` notifications for all participating seller businesses using `tx`.
7. **Error Isolation on Non-Critical Notifications**:
   In `order.service.js` (lines 410–430 and lines 476–498), both low-stock and order placed notification dispatches are wrapped in internal `try / catch` blocks. If generating a notification fails, the service logs a warning via `console.warn` and continues without aborting the transaction, ensuring that non-critical notification failures do not roll back an otherwise valid financial purchase order.

---

### 8.2 Inventory Restoration on Order Cancellation / Rejection
In `backend/src/services/order.service.js` (lines 718–738), when an order transitions to `"Cancelled"` or `"Rejected"`, inventory is restored inside an atomic transaction:
```javascript
// backend/src/services/order.service.js (lines 724-738)
if (newStatus === "Rejected" || newStatus === "Cancelled") {
  for (const item of order.items) {
    if (item.productId && UUID_REGEX.test(item.productId)) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }
  }
}
```

---

### 8.3 Concurrency Analysis & Current Stock Validation Limitation

#### How Stock is Currently Validated:
In `backend/src/services/order.service.js` (lines 217–222), stock availability is verified in Node.js application memory *before* entering `prisma.$transaction`:
```javascript
if (product.stock < qty) {
  throw new AppError(
    `Insufficient stock for "${product.name}". Available stock: ${product.stock}, requested: ${qty}`,
    400
  );
}
```

#### The Concurrency Limitation:
- **PostgreSQL Default Isolation**: PostgreSQL runs under the **`READ COMMITTED`** isolation level.
- **Race Condition Scenario**:
  1. A product SKU has `stock = 10`.
  2. Buyer A requests 10 units. Buyer B simultaneously requests 10 units.
  3. Both requests execute `validateOrderItems` concurrently in application code. Both read `stock = 10` and pass validation.
  4. Both enter `prisma.$transaction`.
  5. Buyer A acquires a row lock on `Product` and executes `stock: { decrement: 10 }`. Stock becomes `0`. Buyer A commits.
  6. Buyer B was waiting on the row lock. Upon acquiring the lock, Buyer B's transaction executes `stock: { decrement: 10 }` on the current stock (`0`).
  7. **Result**: Because `backend/prisma/schema.prisma` declares `stock Int @default(0)` without a PostgreSQL check constraint, stock drops to **`-10`** (overselling).

#### Production Solutions:
1. **Database-Level CHECK Constraint**:
   Add a check constraint directly to PostgreSQL via an SQL migration:
   ```sql
   ALTER TABLE "Product" ADD CONSTRAINT "stock_non_negative" CHECK (stock >= 0);
   ```
   When Buyer B's transaction attempts to decrement stock below zero, PostgreSQL raises a constraint violation error (`23514 check_violation`), causing Buyer B's transaction to abort and roll back safely.
2. **Conditional Atomic Update**:
   Update stock with a conditional `WHERE` clause:
   ```sql
   UPDATE "Product" SET stock = stock - $qty WHERE id = $id AND stock >= $qty;
   ```
   If affected rows equals 0, throw an out-of-stock exception.

---

## 9. Database Setup and Commands

### 9.1 Initial Prerequisites
- **Node.js**: v18+ or v20+
- **PostgreSQL**: v16+ running locally or via Docker
- Ensure target database exists (e.g. `createdb vyaparsetu`)

### 9.2 Environment Configuration
Create a `.env` file inside the `backend/` directory (use `.env.example` as a template):
```bash
# backend/.env (Database connection configuration only)
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<database_name>?schema=public"
```

---

### 9.3 Common Database CLI Commands

#### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

#### 2. Generate Prisma Client
Generates the type-safe Prisma Client JavaScript code from `schema.prisma`:
```bash
npx prisma generate
```

#### 3. Run Pending Database Migrations
Applies pending SQL migrations to the local PostgreSQL database:
```bash
npx prisma migrate dev
```
*(In production environments, use `npx prisma migrate deploy`)*

#### 4. Check Migration Status
Verifies if all migrations in `backend/prisma/migrations/` have been applied:
```bash
npx prisma migrate status
```

#### 5. Open Prisma Studio (Visual Web Inspector)
Launches an interactive web UI on `http://localhost:5555` to view, search, and edit database records:
```bash
npx prisma studio
```

#### 6. Direct PostgreSQL Inspection via `psql`
```bash
# Connect to PostgreSQL
psql "<your_database_connection_string>"

# List all tables in public schema
\dt

# Inspect columns, constraints, and indexes of the Order table
\d "Order"

# Inspect columns, constraints, and indexes of the Product table
\d "Product"

# Run a sample 3-table join query checking order items and live stock
SELECT o."orderNumber", o.status, o."totalAmount", oi."productName", oi.quantity, oi."unitPrice", p.stock AS live_stock 
FROM "Order" o 
JOIN "OrderItem" oi ON oi."orderId" = o.id 
LEFT JOIN "Product" p ON oi."productId" = p.id 
LIMIT 5;
```

---

## 10. Future Improvements (Roadmap)

The following architectural enhancements are planned for future scalability phases. They are clearly distinguished from current implementations:

```
+--------------------------------------------------------------------------------+
|                         PLANNED ARCHITECTURAL ROADMAP                          |
+--------------------------------------------------------------------------------+
|  1. Database CHECK Constraint   --> Prevents negative stock under race conditions|
|  2. PgBouncer Connection Pooler --> Multiplexes concurrent mobile connections  |
|  3. Range Partitioning          --> Partitions Order tables by quarterly dates |
|  4. Streaming Read Replicas     --> Offloads read queries from primary database|
|  5. Redis Caching Layer         --> Caches categories and popular SKUs in RAM  |
+--------------------------------------------------------------------------------+
```

### 1. Database-Level Check Constraint for Stock
* **Status**: *Planned*
* **Target**: Add `CHECK (stock >= 0)` on `Product` to eliminate race conditions under concurrent checkouts at the engine level.

### 2. Dedicated Connection Pooler (PgBouncer)
* **Status**: *Planned*
* **Target**: Deploy PgBouncer in transaction pooling mode in front of PostgreSQL. This allows thousands of concurrent mobile app instances to share a modest pool of 50–100 physical PostgreSQL server connections, avoiding memory starvation.

### 3. Declarative Table Range Partitioning
* **Status**: *Planned for Scale*
* **Target**: When `Order` and `OrderItem` tables grow large, partition them by quarterly date ranges (`createdAt`). Recent transactions stay in high-speed RAM buffers, while historical quarters can be queried independently.

### 4. PostgreSQL Read Replicas
* **Status**: *Planned*
* **Target**: Configure asynchronous streaming replication to read-only replicas. Route catalog search and category browsing traffic (`GET /api/products`) to read replicas, reserving the primary database instance exclusively for write transactions.

### 5. Redis In-Memory Caching
* **Status**: *Planned*
* **Target**: Introduce Redis to cache static lookup data—such as product categories, featured listings, and bulk discount matrices—reducing read pressure on PostgreSQL.
