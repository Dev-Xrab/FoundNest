const fetchSharedStudentSpaces = async () => {
  try {
    const response = await fetch(
      "https://foundnest-backend.onrender.com/api/shared-spaces",
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    return data.map((space) => space.shared_space_name);
  } catch (error) {
    console.error("Error fetching shared student spaces:", error);
    return [
      "Activity Center",
      "BulSu E-Library",
      "Canteen/Food Court",
      "Heroes Park",
    ];
  }
};

export default fetchSharedStudentSpaces;
