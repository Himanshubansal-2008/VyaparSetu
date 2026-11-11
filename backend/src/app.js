const express = require('express');
const cors = require("cors");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");

const app = express();

app.use(cors({
  origin: "http://localhost:8081",
}));

app.use(express.json());
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'VyaparSetu API is running',
  });
});

module.exports = app;