
const API_BASE_URL = "http://localhost:5050/api";

export const getProducts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/products?limit=100`);

    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    const result = await response.json();

    return result.data.products;
  } catch (error) {
    console.error("Product API Error:", error);
    throw error;
  }
};
export const getCategories = async () => {
  const response = await fetch("http://localhost:5050/api/categories");
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch categories");
  }

  return result.data;
};

export const getBusinesses = async () => {
  const response = await fetch("http://localhost:5050/api/businesses");
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch businesses");
  }

  return result.data;
};

export const createProduct = async (productData) => {
  const response = await fetch("http://localhost:5050/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to create product");
  }

  return result.data;
};


export const updateProduct = async (productId, productData) => {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productData),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to update product");
  }

  return result.data;
};

export const updateProductStock = async (productId, stock) => {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stock }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to update stock");
  }

  return result.data;
};
