// centerLocation.js

const fetchBulsuColleges = async () => {
  try {
    const response = await fetch(
      "https://foundnest-backend.onrender.com/api/offices",
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Extract only the college_name from each object
    return data.map((college) => college.office_name);
  } catch (error) {
    console.error("Error fetching BulSU colleges:", error);
    // Fallback array so the UI stays stable if the API fails
    return ["College of Information and Communications Technology"];
  }
};

export default fetchBulsuColleges;
