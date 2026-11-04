const express = require('express');
const categoryRoutes = require("./routes/category.routes");

const app = express();

app.use(express.json());
app.use("/api/categories", categoryRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'VyaparSetu API is running',
  });
});

module.exports = app;