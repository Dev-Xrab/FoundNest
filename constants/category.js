// @/constants/category.js

import { fetchWithAuth } from "./authApi";

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
    // Make sure to include https://
    const response = await fetchWithAuth(
      "https://foundnest-backend.onrender.com/api/categories",
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetched categories:", data); // Log the fetched data for debugging
    return data; // Return the data so the component can receive it
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return []; // Return an empty array as a fallback if it fails
  }
};
