// @/constants/category.js

export const category = [
  "Academic Material",
  "Clothing and Accessories",
  "Electronics",
  "Official Documents",
  "Personal Items",
  "Equipments",
];

// FETCH CATEGORIES
export const getCategories = async () => {
  try {
    const response = await fetch("https://foundnest-backend.onrender.com/api/categories");
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetched categories:", data);
    return data;
    
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
};

/**
 * Matches an AI-returned category string to the closest item in the
 * categories list fetched from the backend.
 *
 * @param {string} aiCategory - The category string returned by Gemini
 * @param {Array}  categoryList - Array of { category_id, category_name }
 * @returns The matched category object, or null if nothing matches
 */
export const matchCategoryFromAi = (aiCategory, categoryList) => {
  if (!aiCategory || !categoryList?.length) return null;

  const normalized = aiCategory.trim().toLowerCase();

  // 1. Exact match (case-insensitive)
  const exact = categoryList.find(
    (c) => c.category_name.toLowerCase() === normalized
  );
  if (exact) return exact;

  // 2. Partial match — AI string contains the category name or vice versa
  const partial = categoryList.find(
    (c) =>
      normalized.includes(c.category_name.toLowerCase()) ||
      c.category_name.toLowerCase().includes(normalized)
  );
  if (partial) return partial;

  return null;
};
