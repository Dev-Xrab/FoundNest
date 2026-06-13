const fetchGates = async () => {
  try {
    const response = await fetch(
      "https://foundnest-backend.onrender.com/api/gates",
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    return data.map((gate) => gate.gate_name);
  } catch (error) {
    console.error("Error fetching gates:", error);
    return ["Gate 1", "Gate 2", "Gate 3", "Gate 4"]; // Fallback safe UI arrays
  }
};

export default fetchGates;
