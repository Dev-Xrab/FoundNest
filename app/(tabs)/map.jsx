import AppColors from "@/constants/AppColors";
import { fetchBulsuColleges } from "@/constants/centerLocation";
import { Ionicons } from "@expo/vector-icons";
import {
  Camera,
  Map,
  Marker,
  NativeUserLocation,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ConfirmDiscardModal from "../../components/ConfirmDiscardModal";
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
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(false);
  const [isWakingGPS, setIsWakingGPS] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [colleges, setColleges] = useState([]);

  // --- Confirm Discard Modal Config State ---
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    message: "",
    cancelLabel: "Cancel",
    confirmLabel: "OK",
    onConfirm: () => {},
  });

  // Helper function to trigger custom modal dialogs easily
  const showCustomAlert = ({
    message,
    cancelLabel = "Cancel",
    confirmLabel = "OK",
    onConfirm = () => {},
  }) => {
    setModalConfig({
      visible: true,
      message,
      cancelLabel,
      confirmLabel,
      onConfirm: () => {
        onConfirm();
        setModalConfig((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  // --- Search States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredColleges, setFilteredColleges] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  // --- Incoming params ---
  const { officeId } = useLocalSearchParams();
  const lastProcessedIdRef = useRef(null);

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
          showCustomAlert({
            message:
              "Location Access Needed: FoundNest can still show campus offices, but enable location to view your live distance.",
            cancelLabel: "Dismiss",
            confirmLabel: "Got It",
          });
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
        }
      } catch (error) {
        console.error("Error fetching colleges:", error);
      } finally {
        setIsDataLoading(false);
      }
    }

    loadColleges();
  }, []);

  // 3. Handle incoming parameter checking
  useEffect(() => {
    function processIncomingOffice() {
      if (!officeId || !Array.isArray(colleges) || colleges.length === 0) {
        return;
      }

      const target = colleges.find(
        (college) => college?.office_id?.toString() === officeId.toString()
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
    }

    processIncomingOffice();

    const unsubscribe = navigation.addListener("focus", () => {
      processIncomingOffice();
    });

    return unsubscribe;
  }, [officeId, colleges, navigation]);

  // --- Search Functions ---
  function handleSearch(text) {
    setSearchQuery(text);
    if (text) {
      const filtered = colleges.filter((college) =>
        college.office_name.toLowerCase().includes(text.toLowerCase())
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
          college.office_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
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

  // Directly clears the search input without confirmation dialog
  function requestClearSearch() {
    setSearchQuery("");
    setFilteredColleges([]);
    setIsDropdownVisible(false);
  }

  function handleMarkerPress(college) {
    setSelectedOffice(college);
    setModalVisible(true);
  }

  function handleCloseModal() {
    setModalVisible(false);
    setSelectedOffice(null);
    navigation.setParams({ officeId: undefined });
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

          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={requestClearSearch}
              style={styles.iconContainer}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}

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
          minZoom={15}
          maxZoom={20}
        />

        {hasPermission && !isWakingGPS && <NativeUserLocation />}

        {colleges
          .filter(
            (college) =>
              college.longitude !== null && college.latitude !== null
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

      {/* Office Details Modal */}
      <OfficeModal
        visible={modalVisible}
        onClose={handleCloseModal}
        office={selectedOffice}
      />

      {/* Reusable ConfirmDiscardModal for all alert/confirmation popups */}
      <ConfirmDiscardModal
        visible={modalConfig.visible}
        message={modalConfig.message}
        cancelLabel={modalConfig.cancelLabel}
        confirmLabel={modalConfig.confirmLabel}
        onKeepEditing={() =>
          setModalConfig((prev) => ({ ...prev, visible: false }))
        }
        onDiscard={modalConfig.onConfirm}
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
    paddingLeft: 12,
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
    padding: 10,
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