import AppColors from "@/constants/AppColors";
import { getCategories } from "@/constants/category";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import { fetchWithAuth } from "@/constants/authApi";
import { bulsuColleges } from "@/constants/centerLocation";
import { gates } from "@/constants/Gates";
import { sharedStudentSpaces } from "@/constants/SharedStudentSpaces";

// --- FILTER CHIP COMPONENT ---
const FilterChip = ({
  label = "All Categories",
  onPress,
  isActive = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.chip, isActive && styles.activeChip]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, isActive && styles.activeText]}>{label}</Text>
    </TouchableOpacity>
  );
};

// --- DATE FORMATTER --- since the backend returns a raw datetime string, we need to format it for display BOOM BOOM
const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");

  return `${mm}/${dd}/${yyyy} | ${formattedHours}:${minutes} ${ampm}`;
};

// --- MAIN COMPONENT ---
const Find = () => {
  const [searchQuery, setSearchQuery] = useState(""); // For the search bar input
  const [items, setItems] = useState([]); // All found items fetched from the backend
  const [loading, setLoading] = useState(true); // Loading state while fetching data, to make sure the user sees a loader instead of an empty screen. Set to false once data is fetched.

  const [categories, setCategories] = useState([]);

  // -- FILTER STATES --
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);

  // Tracks which main dropdown is open
  const [activeMenu, setActiveMenu] = useState(null); // null, 'categories', or 'locations'
  // Tracks which nested location folder-tab is open
  const [activeLocationGroup, setActiveLocationGroup] = useState(null); // sub categories for locations: 'college', 'shared', 'gates'

  // -- FORMATTED LOCATION GROUPS --
  const collegeBuildings = bulsuColleges
    ? bulsuColleges.map((c) => c.building)
    : [];
  const locationGroups = [
    {
      id: "college",
      title: "College Buildings",
      items: ["All College Buildings", ...collegeBuildings],
    },
    {
      id: "shared",
      title: "Shared Student Spaces",
      items: sharedStudentSpaces || [],
    },
    {
      id: "gates",
      title: "Gates",
      items: gates || [],
    },
  ];

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      const data = await getCategories();
      const formattedCategories = data.map((cat) => cat.category_name || cat);
      setCategories(formattedCategories);
    };
    fetchCategories();
  }, []);

  // Fetch Reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetchWithAuth(
          "https://foundnest-backend.onrender.com/api/found-reports",
        );
        const json = await response.json();
        console.log("Raw fetched data:", json); // Debug log to check raw data from backend

        const formattedData = json.map((item) => ({
          id: item.found_report_id.toString(),
          title: item.item_name,
          category: item.category_name,
          date: formatDateTime(item.found_date),
          location: item.location_found,
          currentLocation: `${item.office_name} `,
          imageUrl: item.image_url,
          description: item.description,
          reportedBy: item.reported_by,
          status: item.status,
          office_id: item.office_id,
        }));

        setItems(formattedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // MULTI-SELECT TOGGLE LOGIC: CATEGORIES
  const toggleCategory = (categoryClicked) => {
    if (categoryClicked === "All Categories") {
      setSelectedCategories([]);
      setActiveMenu(null);
      return;
    }
    setSelectedCategories((prev) => {
      if (prev.includes(categoryClicked))
        return prev.filter((cat) => cat !== categoryClicked);
      return [...prev, categoryClicked];
    });
  };

  // MULTI-SELECT TOGGLE LOGIC: LOCATIONS
  const toggleLocation = (locationClicked) => {
    if (locationClicked === "All Locations") {
      setSelectedLocations([]);
      setActiveMenu(null);
      return;
    }
    setSelectedLocations((prev) => {
      if (prev.includes(locationClicked))
        return prev.filter((loc) => loc !== locationClicked);
      return [...prev, locationClicked];
    });
  };

  // FILTER LOGIC
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(item.category);
    const matchesLocation =
      selectedLocations.length === 0 ||
      selectedLocations.includes(item.location);
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // DISPLAY TEXT labels for the filter triggers
  let categoryDisplayText = "All Categories";
  if (selectedCategories.length === 1)
    categoryDisplayText = selectedCategories[0];
  else if (selectedCategories.length > 1)
    categoryDisplayText = `${selectedCategories.length} Selected`;

  let locationDisplayText = "All Locations";
  if (selectedLocations.length === 1)
    locationDisplayText = selectedLocations[0];
  else if (selectedLocations.length > 1)
    locationDisplayText = `${selectedLocations.length} Selected`;

  let claimedDisplayText = "Claimed";
  if (selectedCategories.includes("Claimed")) claimedDisplayText = "Claimed";

  // Helper Component for the Nested Folder Tabs
  const LocationTab = ({ group }) => {
    const isActive = activeLocationGroup === group.id;
    return (
      <TouchableOpacity
        style={[styles.locTab, isActive && styles.locTabActive]}
        onPress={() => setActiveLocationGroup(isActive ? null : group.id)}
        activeOpacity={1}
      >
        <Text style={[styles.locTabText, isActive && styles.locTabTextActive]}>
          {group.title}
        </Text>
        <Icon
          name={isActive ? "chevron-up" : "chevron-down"}
          size={16}
          color="#A31D1D"
          style={{ marginLeft: 6 }}
        />
      </TouchableOpacity>
    );
  };

  const renderItem = (
    { item }, // Debug log to check item data before rendering
  ) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        console.log("Rendering item:", item);
        router.push({
          pathname: "/FoundItemDetails",
          params: { itemString: JSON.stringify(item) },
        });
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      <View style={styles.categoryTag}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardRow}>
          <Icon name="calendar-outline" size={12} color="#666" />
          <Text style={styles.cardDetail} numberOfLines={1}>
            {item.date}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Icon name="location-outline" size={12} color="#666" />
          <Text style={styles.cardDetail} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Found Item Gallery</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon
          name="search-outline"
          size={20}
          color={AppColors.background}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Item"
          value={searchQuery}
          placeholderTextColor="#999"
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Section */}
      <View style={styles.filters}>
        {/* Trigger Bar */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterChipTrigger,
              activeMenu === "categories" && styles.activeTriggerBg,
            ]}
            onPress={() => {
              setActiveMenu(activeMenu === "categories" ? null : "categories");
              setActiveLocationGroup(null); // Reset sub-menu
            }}
          >
            <Text
              style={[
                styles.filterText,
                activeMenu === "categories" && styles.activeTriggerText,
              ]}
              numberOfLines={1}
            >
              {categoryDisplayText}
            </Text>
            <Icon
              name={activeMenu === "categories" ? "chevron-up" : "chevron-down"}
              size={14}
              color={
                activeMenu === "categories" ? "#A31D1D" : AppColors.background
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChipTrigger,
              activeMenu === "locations" && styles.activeTriggerBg,
            ]}
            onPress={() => {
              setActiveMenu(activeMenu === "locations" ? null : "locations");
              setActiveLocationGroup("college"); // Auto-open the first tab when opening locations
            }}
          >
            <Text
              style={[
                styles.filterText,
                activeMenu === "locations" && styles.activeTriggerText,
              ]}
              numberOfLines={1}
            >
              {locationDisplayText}
            </Text>
            <Icon
              name={activeMenu === "locations" ? "chevron-up" : "chevron-down"}
              size={14}
              color={
                activeMenu === "locations" ? "#A31D1D" : AppColors.background
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChipTrigger,
              activeMenu === "claimed" && styles.activeTriggerBg,
            ]}
            onPress={() => {
              setActiveMenu(activeMenu === "claimed" ? null : "claimed");
            }}
          >
            <Text
              style={[
                styles.filterText,
                activeMenu === "claimed" && styles.activeTriggerText,
              ]}
              numberOfLines={1}
            >
              {claimedDisplayText}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Category Chips */}
        {activeMenu === "categories" && (
          <View style={styles.dropdownWhiteCard}>
            <View style={styles.filterItemsContainer}>
              <FilterChip
                label="All Categories"
                isActive={selectedCategories.length === 0}
                onPress={() => toggleCategory("All Categories")}
              />
              {categories.map((category, index) => (
                <FilterChip
                  key={`cat-${index}`}
                  label={category}
                  isActive={selectedCategories.includes(category)}
                  onPress={() => toggleCategory(category)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Dynamic Nested Location Folders */}
        {activeMenu === "locations" && (
          <View style={styles.dropdownWhiteCard}>
            {" "}
            // Container ng lahat
            <ScrollView
              style={styles.scrollableFilterContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* ROW 1: College & Shared Tabs */} // Div na may dalawang tabs
              sa itaas para sa College at Shared spaces. Gates tab is alone sa
              row 2 sa ibaba
              <View style={styles.locTabsRow}>
                <LocationTab group={locationGroups[0]} />
                <LocationTab group={locationGroups[1]} />
              </View>
              has its own separate box sa row 2.
              {(activeLocationGroup === "college" ||
                activeLocationGroup === "shared") && (
                <View
                  style={[
                    styles.locationContentBox,
                    activeLocationGroup === "college" && styles.flatTopLeft,
                    activeLocationGroup === "shared" && styles.flatTopRight,
                    { flex: 1 },
                  ]}
                >
                  <View style={styles.filterItemsContainer}>
                    {locationGroups
                      .find((g) => g.id === activeLocationGroup)
                      ?.items.map((loc, index) => (
                        <FilterChip
                          key={`loc1-${index}`}
                          label={loc}
                          isActive={selectedLocations.includes(loc)}
                          onPress={() => toggleLocation(loc)}
                        />
                      ))}
                  </View>
                </View>
              )}
              {/* ROW 2: Gates Tab */}
              <View style={[styles.locTabsRow, { marginTop: 10 }]}>
                <LocationTab group={locationGroups[2]} />
              </View>
              {/* ROW 2 CONTENT BOX */}
              {activeLocationGroup === "gates" && (
                <View style={[styles.locationContentBox, styles.flatTopLeft]}>
                  <View style={styles.filterItemsContainer}>
                    {locationGroups[2].items.map((loc, index) => (
                      <FilterChip
                        key={`loc2-${index}`}
                        label={loc}
                        isActive={selectedLocations.includes(loc)}
                        onPress={() => toggleLocation(loc)}
                      />
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* FlatList / Loader */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#A31D1D" />
          <Text style={{ marginTop: 10, color: "#666" }}>
            Loading found items...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No items found matching your filter.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF5F0",
  },
  title: {
    backgroundColor: AppColors.background,
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.surface,
    padding: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#ddd",
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filters: {
    marginBottom: 10,
    backgroundColor: AppColors.surface,
    paddingVertical: 10,
    marginHorizontal: 10,
    borderRadius: 15,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  filterChipTrigger: {
    flex: 1,
    marginHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  activeTriggerBg: {
    borderColor: "#A31D1D",
  },
  filterText: {
    fontSize: 12,
    color: "#333",
    marginRight: 5,
  },
  activeTriggerText: {
    color: "#A31D1D",
    fontWeight: "bold",
  },

  // --- NESTED DROPDOWN FOLDER STYLES ---
  dropdownWhiteCard: {
    backgroundColor: "#fff",
    marginTop: 12,
    marginHorizontal: 10,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#eee",
  },

  locTabsRow: {
    flexDirection: "row",
    gap: 8,
    zIndex: 2,
  },
  locTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  locTabActive: {
    backgroundColor: "#F3F3F3", // Matches content box
    borderWidth: 1,
    borderColor: "#ddd",
    borderBottomWidth: 0, // Erase bottom border to merge with box
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 20,
    marginBottom: 0, // Pulls the active tab down by 1px to hide the gap between it and the content box
  },
  locTabText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    maxWidth: 101,
    width: "auto",
  },
  locTabTextActive: {
    color: "#000",
    fontWeight: "700",
    wrapContent: "wrap",
    overflow: "scroll",
  },
  locationContentBox: {
    backgroundColor: "#F3F3F3",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 5,
    paddingTop: 10,
    marginTop: -1,
    zIndex: 1,
  },
  flatTopLeft: {
    borderTopLeftRadius: 0,
  },
  flatTopRight: {
    borderTopRightRadius: 0,
  },

  // --- GENERAL CHIP STYLES ---
  filterItemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginHorizontal: 5,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: "#eee",
  },
  activeChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#A31D1D",
  },
  text: {
    color: "#333333",
    fontSize: 13,
    fontWeight: "600",
  },
  activeText: {
    color: "#A31D1D",
    fontWeight: "700",
  },

  // --- CARD & LIST STYLES ---
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 80,
  },
  row: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: "48%",
    marginBottom: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#ccc",
  },
  categoryTag: {
    position: "absolute",
    top: 90,
    right: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#333",
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  cardDetail: {
    fontSize: 11,
    color: "#666",
    marginLeft: 5,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
    fontSize: 16,
  },
});

export default Find;
