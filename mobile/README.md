# VyaparSetu Mobile Frontend 📱

The mobile application for **VyaparSetu**, a B2B wholesale marketplace connecting micro and small enterprises (MSMEs). This document covers the marketplace discovery frontend (Member 1 scope): product discovery, category filtering, search, wholesale pricing, minimum order quantities (MOQ), and backend API integration.

---

## 🛠️ Technology Stack

- **Framework**: React Native (v0.88)
- **Tooling**: Expo (SDK 58)
- **Language**: JavaScript (ES6+)
- **UI Components & Icons**: `@expo/vector-icons` (Ionicons), React Native Core Components
- **HTTP Client**: Native `fetch` with centralized `apiClient.js`
- **State Management**: React Hooks (`useState`, `useRef`, `useCallback`, `useMemo`, `useEffect`)

---

## 📁 Project Structure

```text
mobile/
├── App.js                         # Root application component
├── app.json                       # Expo application metadata & config
├── package.json                   # Dependencies & npm scripts
├── .env                           # Local environment variables (EXPO_PUBLIC_API_URL)
├── .env.example                   # Example environment configuration
└── src/
    ├── config/
    │   └── api.js                 # Centralized API endpoints, timeouts, and dynamic host resolution
    ├── services/
    │   ├── apiClient.js           # Fetch wrapper with timeouts, error handling, and query builder
    │   ├── productService.js      # Product listing, featured products, and product details API calls
    │   └── categoryService.js     # Category list and single category API calls
    ├── navigation/
    │   └── AppNavigator.js        # Stack navigation (Home <-> ProductListing <-> ProductDetails)
    ├── screens/
    │   ├── HomeScreen.js           # Marketplace home: categories, featured carousel, curated grid
    │   ├── ProductListingScreen.js # Full catalog: debounced search, category filter, price sort, pagination
    │   └── ProductDetailsScreen.js # Wholesale product details: MOQ banner, bulk pricing table, stock validation
    ├── components/
    │   ├── CategoryCard.js        # Category pill card with icon/image fallback
    │   ├── CategoryList.js        # Horizontal scrolling category list with retry/loading states
    │   ├── FeaturedProducts.js    # Horizontal featured products carousel with error handling
    │   ├── ProductCard.js         # Responsive product grid card with seller name & MOQ
    │   ├── Header.js              # Top bar with search input, notifications, and cart icons
    │   └── EmptyState.js          # Context-aware empty state with action button
    └── theme/
        ├── colors.js              # Theme color definitions
        └── spacing.js             # Spacing constants & border radius
```

---

## ⚙️ Environment Configuration

The frontend dynamically resolves the backend URL via the Expo public environment variable:

```bash
# In mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:5050/api
```

### Dynamic Host Resolution (`api.js`)
When running in web mode or testing across devices:
- **Web Browser**: If accessed via LAN IP (e.g. `192.168.1.5:8081`), the client automatically replaces `localhost` with the active host IP so requests succeed without manual reconfiguration.
- **Android Emulator**: Resolves to `http://10.0.2.2:5050/api`.
- **iOS Simulator / Web**: Defaults to `http://localhost:5050/api`.
- **Production**: Configurable via `EXPO_PUBLIC_API_URL=https://api.vyaparsetu.com/api`.

---

## 🚀 Running the Application

### 1. Start the Backend API Server
First, ensure PostgreSQL is running and start the Express backend:

```bash
# From repository root
node backend/src/server.js
# Or from backend directory
cd backend && npm start
```
*The backend server runs on `http://localhost:5050`.*

### 2. Start the Expo Mobile Application
In a separate terminal:

```bash
# From mobile directory
cd mobile
npm start
```

### Available Scripts:
- `npm run web`: Launch Metro bundler and open the app in a web browser (`http://localhost:8081`).
- `npm run android`: Open the app in an Android emulator.
- `npm run ios`: Open the app in an iOS simulator.
- `npm start`: Start the interactive Expo CLI.

---

## 🔌 API Service Layer

All marketplace data is fetched dynamically from the Node.js backend.

### 1. Centralized API Client (`src/services/apiClient.js`)
- Standardizes HTTP `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Automatically normalizes base URLs and query parameters.
- Built-in abort controller with 15-second request timeout (`TIMEOUT_MS`).
- Throws structured `ApiError(message, statusCode, data)`.

### 2. Product Service (`src/services/productService.js`)
- `getProducts({ search, categoryId, sortBy, sortOrder, page, limit })`:
  Calls `GET /api/products` with sanitized query parameters.
- `getFeaturedProducts({ limit, page })`:
  Calls `GET /api/products/featured` for curated featured listings.
- `getProductById(id)`:
  Calls `GET /api/products/:id` with UUID format validation.
- `sanitizeProductParams(params)`:
  Trims search strings, omits empty parameters, normalizes sort values, and drops `'all'` category filter.

### 3. Category Service (`src/services/categoryService.js`)
- `getCategories()`:
  Calls `GET /api/categories` and returns active categories list.
- `getCategoryById(id)`:
  Calls `GET /api/categories/:id` for specific category metadata.

---

## 🔍 Marketplace Features

### 1. Product Discovery & Navigation
- **Home Screen (`HomeScreen.js`)**:
  - Horizontal category selector.
  - Featured products carousel with discount badges.
  - Curated product grid loaded dynamically via `getProducts({ limit: 12 })`.
  - Selecting a category navigates to `ProductListingScreen` with the filter pre-applied.
- **Product Listing Screen (`ProductListingScreen.js`)**:
  - **Debounced Search**: 350ms debounce on input; trims leading/trailing spaces; case-insensitive.
  - **Category Filtering**: Database UUID-driven filter; "All" option resets filter.
  - **Price Sorting**: Backend sorting (`price_asc` for Low-to-High, `price_desc` for High-to-Low).
  - **Backend Pagination**: Previous / Next controls; page indicator (`Page X of Y`); filter changes reset to page 1.
  - **Stale Response Protection**: `activeRequestIdRef` discards out-of-order network responses.

### 2. Product Details & Wholesale UI (`ProductDetailsScreen.js`)
- **Backend Driven**: Fetches full product details by database UUID (`getProductById`).
- **Seller Profile Integration**: Displays verified business name, address, city, state from `product.business`.
- **Minimum Order Quantity (MOQ)**:
  - Prominent MOQ banner: `Minimum Order Quantity: X units`.
  - Disallows order quantities below MOQ.
- **Bulk Pricing Tiers**:
  - Table sorted ascending by minimum quantity.
  - Handles open-ended ranges (`maxQuantity: null` rendered as `100+`).
  - Automatically highlights the active tier and recalculates price per unit and potential savings.
- **Stock Validation**:
  - Positive integer validation.
  - Prevents ordering more than available stock.
  - Handles special stock states: "Out of Stock" (stock $\le 0$), "Below MOQ" (stock $<$ MOQ), and "Low Stock" (stock $\le 20$).

### 3. UI Reliability & Fallbacks
- **Image Fallbacks**: If `imageUrl` is missing or fails to load, `ProductCard`, `CategoryCard`, and `ProductDetailsScreen` render vector icons (`Ionicons`) without crashing or shifting layout.
- **Loading & Error States**: Independent loading spinners and error banners with retry buttons on Home, Listing, and Details screens.

---

## 🛠️ Troubleshooting API Connectivity

| Problem | Root Cause | Solution |
|---|---|---|
| `Failed to fetch` on mobile web | Backend server is not running or listening on wrong port | Start backend: `node backend/src/server.js` (confirm `running on port 5050`). |
| `Network request failed` on Android Emulator | `localhost` points to the emulator itself, not the host | Ensure `mobile/src/config/api.js` resolves to `http://10.0.2.2:5050/api`. |
| CORS errors in browser console | Origin not permitted or preflight failed | Check `backend/src/app.js` CORS middleware and verify `ALLOWED_ORIGINS` in `backend/.env`. |
| Category pills not loading | Syntax error or duplicate variable in `CategoryCard.js` | Run `npx expo export --platform web` in `mobile/` to check bundle compilation. |
| Products grid empty | Neon database pooler disconnected or sleeping | Verify database connectivity by curling `http://localhost:5050/api/health`. |

