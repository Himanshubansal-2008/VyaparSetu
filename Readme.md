# VyaparSetu 🌉
### Connecting Micro & Small Enterprises to Broader Markets

[![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-58-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.3-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7.10-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

VyaparSetu is a mobile-first B2B wholesale marketplace platform designed to empower micro, small, and medium enterprises (MSMEs). It bridges the gap between local producers, suppliers, and wholesale buyers by providing digital storefronts, tiered wholesale pricing, minimum order quantity (MOQ) validation, quotation negotiation, inventory tracking, and persistent authenticated mobile commerce.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
  - [The Problem](#the-problem)
  - [The Solution](#the-solution)
  - [Target Users](#target-users)
  - [How It Works](#how-it-works)
- [Technology Stack](#-technology-stack)
- [Key Features](#-key-features)
- [Team Contributions](#-team-contributions)
  - [Himanshu Bansal](#himanshu-bansal)
  - [Anuj Raghuwanshi](#anuj-raghuwanshi)
  - [Muskaan Ramrakhyani](#muskaan-ramrakhyani)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Installation and Setup](#-installation-and-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Screenshots](#-screenshots)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)

---

## 📌 Project Overview

### The Problem
Micro and small enterprises (MSMEs) form the backbone of developing economies, yet they face severe structural hurdles:
- **Limited Market Reach**: Small manufacturers and rural producers depend heavily on local middlemen, limiting their revenue and pricing power.
- **Informal Price Negotiation**: Bulk deals, quotation requests, and counteroffers are typically handled over fragmented messaging apps without paper trails or status tracking.
- **Inventory & Surplus Bottlenecks**: Excess stock frequently sits idle because producers lack a dedicated channel to liquidate surplus inventory at wholesale rates.
- **Complex B2B Requirements**: Retail e-commerce solutions lack built-in B2B primitives such as Minimum Order Quantities (MOQs), tiered volume pricing, trade credit, and formal quotation counteroffering.

### The Solution
VyaparSetu establishes a unified digital B2B channel tailored specifically to MSMEs:
- **Digital Business Profiles**: Verified identity and business profiles for both buyers and sellers.
- **Wholesale Marketplace**: Dynamic catalog discovery with automated tiered bulk pricing and MOQ enforcement.
- **Bilateral Price Negotiation**: Structured quotation workflows where buyers submit bids and target prices, and sellers provide binding counteroffers with timeline commitments.
- **Inventory & Surplus Controls**: Real-time stock alerts, inventory health indicators, and surplus liquidation tags.

### Target Users
1. **Manufacturers & Producers**: Small factories, artisans, and agricultural processors seeking wholesale buyers.
2. **Wholesalers & Distributors**: Regional distributors looking to expand buyer networks beyond local geographic boundaries.
3. **Retailers & Bulk Buyers**: Shopkeepers, institutional buyers, and businesses purchasing wholesale inventory in bulk quantities.

### How It Works
```text
1. Registration & Setup   ──►  Sellers establish verified business profiles; buyers create accounts.
2. Catalog & Discovery    ──►  Buyers browse categorized wholesale listings with live MOQ & bulk discounts.
3. Quotation & Bidding    ──►  Buyers submit custom quote requests; sellers counteroffer with timeline & pricing.
4. Ordering & Settlement  ──►  Orders are confirmed, dispatched with carrier tracking, and delivered.
5. Inventory & Management ──►  Sellers monitor stock levels, manage low-inventory alerts, and flag surplus stock.
```

---

## 🛠️ Technology Stack

Only technologies and libraries actually implemented in the repository are listed below:

| Layer | Technologies | Details & Purpose |
| :--- | :--- | :--- |
| **Mobile Frontend** | **React Native** (v0.88)<br>**Expo** (SDK 58) | Cross-platform mobile client for Android, iOS, and Web |
| **Frontend Styling** | **React Native StyleSheet** | Design system with unified tokens for colors, spacing, and border radius |
| **Icons & UI** | **@expo/vector-icons** | Ionicons and MaterialCommunityIcons |
| **Client Storage** | **expo-secure-store**<br>**@react-native-async-storage/async-storage** | Encrypted JWT persistence (`SecureStore`) and offline cache (`AsyncStorage`) |
| **API Client** | **Native Fetch API** | Custom `apiClient` with request timeouts, abort signals, and URL resolution |
| **Backend Runtime** | **Node.js** (v18+)<br>**Express.js** (v5.3) | RESTful API server with modular routing, validation, and error middleware |
| **Database** | **PostgreSQL** (v15+) | Relational database hosted on Neon AWS serverless infrastructure |
| **Database ORM** | **Prisma Client** (v7.10)<br>**@prisma/adapter-pg** | Schema definition, migrations, relation mapping, and transactional integrity |
| **Authentication** | **jsonwebtoken** (v9.0)<br>**bcryptjs** (v3.0) | Signed JWT tokens with Bearer authorization and 12-round salted password hashing |
| **Input Validation** | **Custom Express Validators** | Sanitization and schema validation for products, auth, categories, and queries |
| **Testing** | **Node.js Native Test Runner** (`node:test`, `node:assert`) | Automated integration tests for product lifecycle and relational integrity |

---

## ✨ Key Features

### User Authentication & Session Security *(Implemented)*
- **User Signup**: Registration with name, unique email address, unique 10-digit mobile number, and password confirmation.
- **Secure Password Hashing**: Passwords hashed with `bcryptjs` using 12 salt rounds before storage.
- **JWT Token Authentication**: Signed JWTs issued upon login and registration with configurable expiration (`7d`).
- **Encrypted Token Persistence**: Hardware-backed or keychain storage using `expo-secure-store`.
- **Protected Navigation Guards**: Client-side state transitions preventing unauthenticated access to protected routes and blocking authenticated users from returning to login/signup.
- **Keyboard-Adaptive Layout**: Auto-scrolling, dynamic bottom cushions, and touch persistence for form usability across mobile screen sizes.

### Marketplace & Product Discovery *(Implemented)*
- **Interactive Home Screen**: Curated product grid, category selectors, and featured wholesale carousels.
- **Catalog Search & Filtering**: Multi-token debounced search, category filtering, and price sorting (`price_asc` / `price_desc`).
- **Resilient Fallback Data**: Graceful fallback to cached mock data during backend cold starts or connectivity drops.
- **Pagination & Stale Response Protection**: Offset-based backend pagination with request ID guards against race conditions.

### Wholesale Pricing, Bulk Tiers & MOQ *(Implemented)*
- **Minimum Order Quantity (MOQ)**: Built-in validation ensuring orders meet the seller's minimum order thresholds.
- **Dynamic Bulk Discount Tiers**: Database-driven pricing tiers (`BulkPricing`) providing automated discounts for volume orders.
- **Real-Time Savings Calculation**: Live subtotal and savings display in product details, shopping cart, and checkout.

### Business Profile Management *(Implemented)*
- **Digital Business Profiles**: Company name, category, tax/business IDs, address, pincode, email, and phone.
- **Profile Creation & Editing**: Multi-step onboarding for MSMEs to publish and update commercial details.
- **Session Persistence**: Local business profile subscription and persistence for smooth offline use.

### Cart, Checkout & Orders *(Implemented)*
- **Centralized Cart Context**: Persistent cart state validating MOQ and auto-applying bulk pricing tiers.
- **B2B Checkout Workflow**: Delivery address input, payment method selection (Trade Credit, RTGS, NEFT), and order review.
- **Order Lifecycle Management**: Order creation with auto-generated order numbers, tracking for `Confirmed`, `Dispatched`, `Delivered`, and `Cancelled` statuses.
- **Seller Order Dispatch**: Dedicated seller interface to review buyer orders, dispatch shipments, add carrier tracking numbers, or reject requests with reasons.

### Quotations & Price Negotiations *(Implemented)*
- **Custom Quote Requests**: Buyers submit requests for quotation (RFQ) specifying target unit price, quantity, and delivery timeline.
- **Seller Counteroffers**: Sellers review bids and respond with revised unit prices, quantities, freight terms, and validity windows.
- **Quotation Audit Trail**: Message threads and status transitions (`Submitted`, `Quoted`, `Accepted`, `Ordered`, `Rejected`).

### Inventory Management *(Implemented)*
- **Inventory Dashboard**: High-level KPI summary cards for Total Products, Low Stock alerts (≤20 units), Out of Stock (0 units), and Total Stock Volume.
- **Stock Filtering & Search**: Filter product lists by stock status (`In Stock`, `Low Stock`, `Out of Stock`) and product keywords.
- **Fast Stock Adjustment**: Quick stock updates via `UpdateStockScreen` with input validation.

### Surplus Stock Marketplace *(Partially Implemented)*
- **Backend & Schema Ready *(Implemented)*:** `Product` entity includes `isSurplus`, `surplusQuantity`, `surplusPrice`, and `surplusDeadline` with indexed database queries.
- **Product Creation Integration *(Implemented)*:** Sellers can flag products as surplus during product creation or updates.
- **Dedicated Buyer Surplus Screen *(Planned)*:** Dedicated discount liquidation browsing section for buyers planned for future release.

### Analytics Dashboard & Learning Resources *(Planned)*
- **Analytics KPI Summaries *(Partially Implemented)*:** Basic order totals and revenue metrics exist in `OrderHistoryScreen`.
- **Graphical Analytics Dashboard *(Planned)*:** Visual revenue charts, top-performing product rankings, and buyer retention analytics.
- **Educational Learning Center *(Planned)*:** Dedicated MSME guides on packaging standards, cost reduction, quality control, and digital compliance.

---

## 👥 Team Contributions

### Himanshu Bansal
Responsible for end-to-end user authentication (JWT, password hashing, and protected route navigation) as well as the core marketplace discovery experience, including product search, category filtering, wholesale details, and bulk pricing/MOQ UI.

### Anuj Raghuwanshi
Responsible for business profile management, merchant product creation and editing, the shopping cart and checkout flow, order lifecycle tracking (buyer orders and seller fulfillment), and quotation/counteroffer negotiations.

### Muskaan Ramrakhyani
Responsible for the seller inventory management dashboard, stock tracking and quick adjustments, surplus stock data architecture, and designing the roadmap for future business analytics and learning resources.

---

## 🏗️ System Architecture

VyaparSetu follows a decoupled client-server architecture with persistent local caching and encrypted credentials storage:

```mermaid
flowchart TD
    subgraph Client ["Mobile Client (React Native + Expo SDK 58)"]
        UI["UI Screens & Navigation\n(AppNavigator)"]
        AuthCtx["Auth Context & SecureStore\n(expo-secure-store)"]
        CartCtx["Cart Context & Local State\n(AsyncStorage)"]
        APIClient["API Service Layer\n(apiClient.js)"]
    end

    subgraph Server ["Backend API (Node.js + Express 5.3)"]
        CORS["CORS & Request Parsing Middleware"]
        AuthMW["Auth Middleware\n(JWT & Role Verification)"]
        ValMW["Input Validation Middleware\n(product, auth, query validators)"]
        Controllers["Express Route Controllers\n(auth, product, category)"]
        Services["Domain Services\n(auth.service, product.service, category.service)"]
    end

    subgraph Database ["Data & Persistence Layer"]
        Prisma["Prisma ORM Client 7.10"]
        Postgres[("PostgreSQL Database\n(Hosted on Neon AWS)")]
    end

    UI --> AuthCtx
    UI --> CartCtx
    UI --> APIClient
    APIClient -->|HTTPS REST API Requests| CORS
    CORS --> AuthMW
    AuthMW --> ValMW
    ValMW --> Controllers
    Controllers --> Services
    Services --> Prisma
    Prisma -->|Pooled TCP / SSL| Postgres
```

### Architectural Highlights
1. **Network Resilience**: Mobile client features an automatic 45-second timeout buffer to accommodate serverless/cold-start latency, coupled with seamless fallback to verified cached datasets.
2. **Security Isolation**: Database passwords and JWT signing keys are completely decoupled from source code using environment variables. Password hashes are strictly omitted from all public and profile response payloads.
3. **Relational Integrity**: Foreign key constraints with cascading deletes ensure that when a merchant business or cart is removed, associated items are cleaned up consistently.

---

## 📁 Project Structure

```text
VyaparSetu/
├── backend/                           # Node.js & Express REST API Server
│   ├── prisma/
│   │   └── schema.prisma              # Prisma schema: User, Business, Category, Product, Cart, Order, Quotation
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js     # Signup, login, profile, and auth status handlers
│   │   │   ├── category.controller.js # Category CRUD and query controllers
│   │   │   └── product.controller.js  # Product listing, details, creation, update, and deletion
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js     # JWT Bearer token authentication & role authorization
│   │   │   ├── auth.validator.js      # Signup & login payload validation middleware
│   │   │   └── product.validator.js   # Product creation, update, and query parameter validation
│   │   ├── routes/
│   │   │   ├── auth.routes.js         # /api/auth routes
│   │   │   ├── category.routes.js     # /api/categories routes
│   │   │   └── product.routes.js      # /api/products routes
│   │   ├── services/
│   │   │   ├── auth.service.js        # Authentication business logic, hashing, and token issue
│   │   │   ├── category.service.js    # Category database operations via Prisma
│   │   │   └── product.service.js     # Product search, filter, bulk pricing, and inventory logic
│   │   ├── utils/
│   │   │   ├── password.utils.js      # bcryptjs password hashing and comparison
│   │   │   └── token.utils.js         # JWT generation and verification
│   │   ├── lib/
│   │   │   └── prisma.js              # Centralized Prisma Client singleton instance
│   │   ├── app.js                     # Express app setup, CORS, and endpoint mounting
│   │   └── server.js                  # Server entry point and database connection listener
│   ├── tests/
│   │   └── product.api.test.js        # Automated integration tests for product APIs
│   ├── package.json                   # Backend dependencies and scripts
│   └── .env.example                   # Backend environment template
│
├── mobile/                            # React Native + Expo Mobile Application
│   ├── assets/                        # Icons, splash screens, and image assets
│   ├── src/
│   │   ├── components/                # Reusable presentation components
│   │   │   ├── CategoryCard.js        # Category pill button with icon
│   │   │   ├── CategoryList.js        # Horizontal scrolling category selector
│   │   │   ├── EmptyState.js          # Contextual empty state with action triggers
│   │   │   ├── FeaturedProducts.js    # Horizontal featured products carousel
│   │   │   ├── Header.js              # Marketplace top navigation bar
│   │   │   ├── ProductCard.js         # Product grid item with price and MOQ
│   │   │   └── SearchBar.js           # Search input with clear button
│   │   ├── config/
│   │   │   ├── api.js                 # Base URL resolution, timeout configs, and endpoints
│   │   │   └── index.js               # Configuration exports
│   │   ├── context/
│   │   │   ├── AuthContext.js         # Persistent authentication state and session handlers
│   │   │   └── CartContext.js         # Shopping cart state, bulk pricing, and MOQ calculations
│   │   ├── data/                      # Local data stores, state persistence, and fallbacks
│   │   │   ├── businessProfileData.js # Business profile session persistence
│   │   │   ├── orders.js              # Orders state management and mock fallbacks
│   │   │   ├── products.js            # Curated catalog fallbacks and product state
│   │   │   └── quotations.js          # Quotation thread state management
│   │   ├── navigation/
│   │   │   ├── AppNavigator.js        # Root stack navigator with authentication guards
│   │   │   └── index.js               # Navigation exports
│   │   ├── screens/                   # Full-screen application views
│   │   │   ├── AddProductScreen.js              # Merchant product creation form
│   │   │   ├── BusinessProfileScreen.js         # View business storefront and details
│   │   │   ├── BuyerQuotationDetailsScreen.js   # Buyer quote review and counteroffer
│   │   │   ├── BuyerQuotationsScreen.js         # Buyer RFQ tracker
│   │   │   ├── CartScreen.js                    # Shopping cart with bulk discount calculation
│   │   │   ├── CheckoutScreen.js                # Order checkout and trade credit selection
│   │   │   ├── CreateBusinessProfileScreen.js   # Merchant onboarding and profile editor
│   │   │   ├── EditProductScreen.js             # Merchant product editing view
│   │   │   ├── HomeScreen.js                    # Marketplace home discovery dashboard
│   │   │   ├── InventoryDashboardScreen.js      # Stock status KPIs and inventory health
│   │   │   ├── InventoryListScreen.js           # Inventory stock management and filters
│   │   │   ├── LoginScreen.js                   # User login with credentials validation
│   │   │   ├── OrderConfirmationScreen.js       # Order success confirmation
│   │   │   ├── OrderDetailsScreen.js            # Invoice and itemized order breakdown
│   │   │   ├── OrderHistoryScreen.js            # Order history and status tracking
│   │   │   ├── ProductDetailsScreen.js          # Wholesale product details, MOQ, and tiers
│   │   │   ├── ProductListingScreen.js          # Full catalog search, filter, and pagination
│   │   │   ├── RequestQuotationScreen.js        # Buyer RFQ creation form
│   │   │   ├── SellerOrderDetailsScreen.js      # Merchant order dispatch and fulfillment
│   │   │   ├── SellerOrdersScreen.js            # Merchant incoming orders list
│   │   │   ├── SellerQuotationDetailsScreen.js  # Merchant RFQ evaluation and quote submission
│   │   │   ├── SellerQuotationsScreen.js        # Merchant quotation inbox
│   │   │   ├── SignupScreen.js                  # User registration with keyboard-adaptive UI
│   │   │   └── UpdateStockScreen.js             # Fast stock adjustment tool
│   │   ├── services/
│   │   │   ├── apiClient.js           # Fetch wrapper with timeouts, headers, and query builders
│   │   │   ├── authService.js         # Signup, login, and profile API calls
│   │   │   ├── categoryService.js     # Category retrieval API calls
│   │   │   ├── productService.js      # Product listing, search, details, and stock API calls
│   │   │   └── index.js               # Service layer barrel exports
│   │   ├── theme/
│   │   │   ├── colors.js              # Primary, accent, status, and surface colors
│   │   │   └── spacing.js             # Spacing constants and border radii
│   │   └── utils/
│   │       ├── secureStorage.js       # expo-secure-store encryption helpers
│   │       └── validation.utils.js    # Client-side form validation utilities
│   ├── App.js                         # Root React Native component wrapped in providers
│   ├── app.json                       # Expo configuration metadata
│   ├── package.json                   # Mobile dependencies and scripts
│   └── README.md                      # Detailed mobile frontend documentation
│
├── .gitignore                         # Git exclusion rules
└── README.md                          # Repository documentation
```

---

## 🚀 Installation and Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Local installation or cloud-hosted database (e.g. Neon, Supabase)
- **Expo Go App** (optional): Installed on physical iOS or Android device for mobile testing

---

### 1. Clone Repository

```bash
git clone https://github.com/your-username/VyaparSetu.git
cd VyaparSetu
```

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
# Edit .env with your actual DATABASE_URL and JWT_SECRET

# Generate Prisma Client
npx prisma generate

# Synchronize database schema with PostgreSQL
npx prisma db push

# Start backend server
npm start
```
*The backend API server will start on `http://localhost:5050`.*

To run the automated backend test suite:
```bash
npm test
```

---

### 3. Frontend Setup

Open a new terminal window:

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Configure environment variables
# Create a .env file in the mobile directory:
echo "EXPO_PUBLIC_API_URL=http://localhost:5050/api" > .env

# Start Expo development server
npm start
```

### Available Mobile Scripts:
- **`npm run web`**: Launches the application in your default web browser (`http://localhost:8081`).
- **`npm run android`**: Launches the application in an active Android emulator.
- **`npm run ios`**: Launches the application in an active iOS simulator (macOS required).
- **`npm start`**: Starts the interactive Expo CLI for QR code scanning with Expo Go.

---

## 🔐 Environment Variables

Sensitive credentials, database connection strings, and secret keys must **never** be committed to version control. Configure local `.env` files using the templates below.

### Backend (`backend/.env`)
```ini
# PostgreSQL connection string (supports direct or pooled SSL connections)
DATABASE_URL="postgresql://username:password@localhost:5432/vyaparsetu?sslmode=prefer"

# Cryptographic secret for signing and verifying JSON Web Tokens (min 32 characters)
JWT_SECRET="your_secure_jwt_secret_key_minimum_32_characters"

# Token validity duration
JWT_EXPIRES_IN="7d"

# Port on which the Express server listens
PORT=5050

# Configurable CORS allowed origins (comma-separated for multiple origins)
CORS_ORIGIN="http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081"
```

### Frontend (`mobile/.env`)
```ini
# Base URL pointing to the active VyaparSetu backend API
# Local development:
EXPO_PUBLIC_API_URL="http://localhost:5050/api"

# Production deployment:
# EXPO_PUBLIC_API_URL="https://your-production-service.onrender.com/api"
```

---

## 📡 API Documentation

All API endpoints are prefixed with `/api`. Verified route mappings are documented below:

### 1. System & Health
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API server status, version, and endpoints list | None |
| `GET` | `/api/health` | Health check probe | None |

### 2. Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/status` | Module status and encryption configuration | None |
| `POST` | `/api/auth/signup` | Register new user; returns JWT token & user | None |
| `POST` | `/api/auth/login` | Authenticate user credentials; returns JWT token | None |
| `GET` | `/api/auth/profile` | Retrieve profile of authenticated user | Bearer Token |
| `GET` | `/api/auth/seller-only` | Protected demo endpoint for sellers | Bearer Token (Role: SELLER) |
| `GET` | `/api/auth/admin-only` | Protected demo endpoint for administrators | Bearer Token (Role: ADMIN) |

### 3. Categories (`/api/categories`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | List all active product categories | None |
| `GET` | `/api/categories/:id` | Retrieve single category details by UUID | None |
| `POST` | `/api/categories` | Create new category record | None (Public/Admin) |
| `PUT` | `/api/categories/:id` | Update category details by UUID | None (Public/Admin) |
| `DELETE` | `/api/categories/:id` | Delete category by UUID | None (Public/Admin) |

### 4. Products (`/api/products`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Query products (supports `search`, `categoryId`, `isFeatured`, `sortBy`, `sortOrder`, `page`, `limit`) | None |
| `GET` | `/api/products/featured` | Retrieve curated list of featured products | None |
| `GET` | `/api/products/:id` | Retrieve detailed product information including seller business and bulk pricing tiers | None |
| `POST` | `/api/products` | Create a new product with MOQ and bulk pricing | None (Public/Seller) |
| `PUT` | `/api/products/:id` | Update product details, stock, or bulk pricing | None (Public/Seller) |
| `DELETE` | `/api/products/:id` | Permanently delete product by UUID | None (Public/Seller) |
| `PATCH` | `/api/products/:id/deactivate` | Soft-deactivate product (`isActive: false`) | None (Public/Seller) |
| `PATCH` | `/api/products/:id/featured` | Update product featured status (`isFeatured: true/false`) | None (Public/Seller) |

---
