import { fetchWithAuth } from "./authApi";

const fetchBulsuColleges = async () => {
  try {
    const res = await fetchWithAuth(
      "https://foundnest-backend.onrender.com/api/offices",
    );

    if (!res.ok) {
      throw new Error(`Server responded with HTTP status: ${res.status}`);
    }

    const data = await res.json();

    // THE FIX: Return 'data' directly because the API response is already an array!
    return data;
  } catch (err) {
    console.error("Failed to fetch colleges:", err.message || err);
    return [];
  }
};

export default fetchBulsuColleges;
