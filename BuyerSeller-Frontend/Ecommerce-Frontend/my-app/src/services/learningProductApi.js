const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getProductsForLearning() {
  const response = await fetch(
    `${API_BASE_URL}/api/products?page=1&pageSize=10`
  );

  if (!response.ok) {
    throw new Error(
      `Backend returned status ${response.status}`
    );
  }

  const data = await response.json();

  return data;
}