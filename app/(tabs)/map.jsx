import AppColors from "@/constants/AppColors";
import fetchBulsuColleges from "@/constants/centerLocation";
import { Ionicons } from "@expo/vector-icons";
import {
  Camera,
  Map,
  Marker,
  NativeUserLocation,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import OfficeModal from "./officeModal";

const BULSU_CENTER = [120.8142, 14.8582];
const MARKER_COLOR = "#D32F2F";

const highDetailHybridStyle = {
  version: 8,
  sources: {
    "google-hybrid": {
      type: "raster",
      tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
      tileSize: 256,
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: "google-hybrid-layer",
      type: "raster",
      source: "google-hybrid",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export default function MapScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isWakingGPS, setIsWakingGPS] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [colleges, setColleges] = useState([]);

  // --- Search States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredColleges, setFilteredColleges] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  // --- Incoming params (for "View Office Location" deep link) ---
  const { officeId } = useLocalSearchParams();

  const [cameraConfig, setCameraConfig] = useState({
    center: BULSU_CENTER,
    zoom: 17,
    animationDuration: 2000,
  });

  // 1. Fetch GPS Location
  useEffect(() => {
    async function activateAndFetchGPS() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Location access",
            "FoundNest can still show campus offices. Enable location to see your distance from them.",
          );
          setIsWakingGPS(false);
          return;
        }

        setHasPermission(true);

        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (err) {
        console.warn("GPS lock failed:", err);
      } finally {
        setIsWakingGPS(false);
      }
    }

    activateAndFetchGPS();
  }, []);

  // 2. Fetch Colleges Data
  useEffect(() => {
    async function loadColleges() {
      try {
        const data = await fetchBulsuColleges();
        if (data && data.length > 0) {
          setColleges(data);
          console.log("Colleges loaded:", data);
        }
      } catch (error) {
        console.error("Error fetching colleges:", error);
      } finally {
        setIsDataLoading(false);
      }
    }

    loadColleges();
  }, []);

  // 3. Handle incoming "View Office Location" param
  // Once colleges are loaded, find the matching office, fly the camera to it,
  // and open its modal automatically.
  useEffect(() => {
    if (!officeId || colleges.length === 0) return;

    const target = colleges.find(
      (college) => college.office_id.toString() === officeId.toString(),
    );

    if (target) {
      const lng = parseFloat(target.longitude);
      const lat = parseFloat(target.latitude);

      if (!isNaN(lng) && !isNaN(lat)) {
        setCameraConfig({
          center: [lng, lat],
          zoom: 19,
          animationDuration: 1500,
        });
      }

      setSelectedOffice(target);
      setModalVisible(true);
    }
  }, [officeId, colleges]);

  // --- Search Functions ---
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

  // New function to handle explicitly clicking the dropdown arrow icon
  // Shows all available items if the search bar is empty
  function toggleDropdown() {
    if (isDropdownVisible) {
      setIsDropdownVisible(false);
    } else {
      if (searchQuery.trim() === "") {
        setFilteredColleges(colleges); // Populate list with all items
      } else {
        const filtered = colleges.filter((college) =>
          college.office_name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
        setFilteredColleges(filtered);
      }
      setIsDropdownVisible(true);
    }
  }

  function handleSelectLocation(college) {
    const lng = parseFloat(college.longitude);
    const lat = parseFloat(college.latitude);

    if (!isNaN(lng) && !isNaN(lat)) {
      setCameraConfig({
        center: [lng, lat],
        zoom: 19,
        animationDuration: 1500,
      });
    }

    setSearchQuery(college.office_name);
    setIsDropdownVisible(false);
  }

  function handleMarkerPress(college) {
    setSelectedOffice(college);
    setModalVisible(true);
  }

  function handleCloseModal() {
    setModalVisible(false);
    setSelectedOffice(null);
  }

  return (
    <View style={styles.container}>
      {(isWakingGPS || isDataLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#900000" />
        </View>
      )}

      {/* --- Search Overlay --- */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a Drop-off location..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => {
              if (searchQuery) setIsDropdownVisible(true);
            }}
          />
          {/* Wrapped the icon inside a TouchableOpacity to enable clicks */}
          <TouchableOpacity
            onPress={toggleDropdown}
            style={styles.iconContainer}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDropdownVisible ? "chevron-up" : "chevron-down"}
              size={22}
              color="#888"
            />
          </TouchableOpacity>
        </View>

        {isDropdownVisible && filteredColleges.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={filteredColleges}
              keyExtractor={(item) => item.office_id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleSelectLocation(item)}
                >
                  <Text style={styles.dropdownText}>{item.office_name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      <Map
        style={styles.map}
        mapStyle={JSON.stringify(highDetailHybridStyle)}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          center={cameraConfig.center}
          zoom={cameraConfig.zoom}
          animationDuration={cameraConfig.animationDuration}
        />

        {hasPermission && !isWakingGPS && <NativeUserLocation />}

        {colleges
          .filter(
            (college) =>
              college.longitude !== null && college.latitude !== null,
          )
          .map((college) => {
            const lng = parseFloat(college.longitude);
            const lat = parseFloat(college.latitude);

            if (isNaN(lng) || isNaN(lat)) return null;

            return (
              <Marker
                key={college.office_id}
                id={college.office_id.toString()}
                lngLat={[lng, lat]}
                anchor="bottom"
                onPress={() => handleMarkerPress(college)}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.pinBubble}>
                    <Text style={styles.pinText}>{college.office_name}</Text>
                  </View>
                  <View style={styles.pinTriangle} />
                </View>
              </Marker>
            );
          })}
      </Map>

      <OfficeModal
        visible={modalVisible}
        onClose={handleCloseModal}
        office={selectedOffice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    zIndex: 20,
    elevation: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingLeft: 12, // Swapped paddingHorizontal to allow custom touch targets on the right
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#000",
  },
  iconContainer: {
    padding: 12, // Increases the touch target size for easier clicking
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 0,
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 241, 224, 0.8)",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  pinBubble: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    backgroundColor: MARKER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  pinText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  pinTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: MARKER_COLOR,
    marginTop: -1.5,
  },
});