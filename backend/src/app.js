const express = require('express');
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();

// Configurable CORS supporting development, Expo Web, and production origins
const rawOrigins = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
const configuredOrigins = rawOrigins
  ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

// Standard local development origins for Expo and web testing
const defaultDevOrigins = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'http://127.0.0.1:8081',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    const isAllowed =
      configuredOrigins.includes('*') ||
      configuredOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && defaultDevOrigins.includes(origin)) ||
      configuredOrigins.length === 0;

    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  } else {
    // Non-browser / native mobile clients without Origin header (React Native iOS/Android)
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VyaparSetu Backend Server is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      categories: '/api/categories',
      products: '/api/products',
      featuredProducts: '/api/products/featured',
      auth: '/api/auth',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'VyaparSetu API is running',
  });
});

module.exports = app;