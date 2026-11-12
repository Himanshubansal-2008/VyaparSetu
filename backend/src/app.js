const express = require('express');
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");

const app = express();

// Configurable CORS supporting development and production origins
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    if (configuredOrigins.length > 0) {
      if (configuredOrigins.includes(origin) || configuredOrigins.includes('*')) {
        res.header('Access-Control-Allow-Origin', origin);
      }
    } else {
      // In development, permit request origin (e.g., localhost Expo web)
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    // Non-browser / native mobile clients without Origin header
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

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