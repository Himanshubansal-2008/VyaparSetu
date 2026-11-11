
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
