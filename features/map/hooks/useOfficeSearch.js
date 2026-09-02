import { useState } from "react";

/**
 * Search/filter/dropdown state for the office search bar, shared by the
 * native and web Map screens. `onSelectLocation(lng, lat, college)` is
 * called with the parsed coordinates when a valid office is chosen — each
 * screen decides what "select" means for its own map surface (native just
 * recenters the camera; web also opens the office modal).
 */
export function useOfficeSearch(colleges, onSelectLocation) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredColleges, setFilteredColleges] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  function handleSearch(text) {
    setSearchQuery(text);
    if (text) {
      const filtered = colleges.filter((college) =>
        college.office_name.toLowerCase().includes(text.toLowerCase()),
      );
      setFilteredColleges(filtered);
      setIsDropdownVisible(true);
    } else {
      setFilteredColleges([]);
      setIsDropdownVisible(false);
    }
  }

  function toggleDropdown() {
    if (isDropdownVisible) {
      setIsDropdownVisible(false);
    } else {
      if (searchQuery.trim() === "") {
        setFilteredColleges(colleges);
      } else {
        const filtered = colleges.filter((college) =>
          college.office_name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
        setFilteredColleges(filtered);
      }
      setIsDropdownVisible(true);
    }
  }

  function requestClearSearch() {
    setSearchQuery("");
    setFilteredColleges([]);
    setIsDropdownVisible(false);
  }

  function handleSelectLocation(college) {
    const lng = parseFloat(college.longitude);
    const lat = parseFloat(college.latitude);

    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      onSelectLocation(lng, lat, college);
    }

    setSearchQuery(college.office_name);
    setIsDropdownVisible(false);
  }

  return {
    searchQuery,
    filteredColleges,
    isDropdownVisible,
    setIsDropdownVisible,
    handleSearch,
    toggleDropdown,
    requestClearSearch,
    handleSelectLocation,
  };
}
