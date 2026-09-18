import AppColors from "@/constants/AppColors";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import "leaflet/dist/leaflet.css";
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

import OfficeModal from "./components/OfficeModal";
import { useColleges } from "./hooks/useColleges";
import { useOfficeParamSync } from "./hooks/useOfficeParamSync";
import { useOfficeSearch } from "./hooks/useOfficeSearch";
import { GOOGLE_HYBRID_TILE_URL } from "./mapStyle";

const BULSU_CENTER = { lng: 120.8142, lat: 14.8582 };
const MARKER_COLOR = "#D32F2F";

// Leaflet touches `window` as soon as its module body runs, which crashes
// Expo Router's dev-server/SSR pass (evaluated in Node, no `window` there).
// require()-ing it lazily, only from inside an effect (client-only, never
// during SSR), avoids that entirely — a static top-level import would
// execute too early regardless of whether anything in the file calls it.
function getLeaflet() {
  return require("leaflet");
}

// Same look as native's OfficeMarkerPin, as an L.divIcon (Leaflet markers
// take an HTML string / element, not a React component).
function buildPinIcon(L, label) {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
        <div style="padding:5px 8px;border-radius:8px;border:1.5px solid #FFFFFF;
                    background-color:${MARKER_COLOR};color:#FFFFFF;font-size:11px;
                    font-weight:900;white-space:nowrap;box-shadow:0 2px 2px rgba(0,0,0,0.3);">
          ${label}
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;
                    border-right:6px solid transparent;border-top:8px solid ${MARKER_COLOR};
                    margin-top:-1.5px;"></div>
      </div>
    `,
    iconAnchor: [0, 0],
  });
}

/** Web version of the map tab. Real Leaflet map with one marker per office,
 * instead of the old OpenStreetMap iframe embed — that only supported a
 * single marker total, so every office except whichever was last searched
 * for was invisible. (MapLibre GL JS, the engine native uses, was tried
 * first but its Web Worker + import.meta usage doesn't bundle under Metro;
 * Leaflet is plain DOM/Canvas with no such requirement.) */
export default function MapScreenWeb() {
  const navigation = useNavigation();
  const { colleges, isLoading: isDataLoading } = useColleges();

  const [selectedOffice, setSelectedOffice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Create the map once.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const L = getLeaflet();
    const map = L.map(mapContainerRef.current, {
      center: [BULSU_CENTER.lat, BULSU_CENTER.lng],
      zoom: 17,
      minZoom: 15,
      maxZoom: 20,
      attributionControl: false,
      zoomControl: false,
    });

    L.tileLayer(GOOGLE_HYBRID_TILE_URL, { maxZoom: 20 }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function flyTo(lng, lat, zoom = 19) {
    mapRef.current?.flyTo([lat, lng], zoom, { duration: 1.5 });
  }

  function handleMarkerPress(college) {
    setSelectedOffice(college);
    setModalVisible(true);
  }

  // Re-render markers whenever the office list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const L = getLeaflet();

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = colleges
      .filter((college) => college.longitude !== null && college.latitude !== null)
      .reduce((markers, college) => {
        const lng = parseFloat(college.longitude);
        const lat = parseFloat(college.latitude);
        if (Number.isNaN(lng) || Number.isNaN(lat)) return markers;

        const marker = L.marker([lat, lng], { icon: buildPinIcon(L, college.office_name) })
          .addTo(map)
          .on("click", () => handleMarkerPress(college));

        markers.push(marker);
        return markers;
      }, []);
  }, [colleges]);

  const {
    searchQuery,
    filteredColleges,
    isDropdownVisible,
    setIsDropdownVisible,
    handleSearch,
    toggleDropdown,
    handleSelectLocation,
  } = useOfficeSearch(colleges, (lng, lat, college) => {
    flyTo(lng, lat);
    setSelectedOffice(college);
    setModalVisible(true);
  });

  useOfficeParamSync(
    colleges,
    (target) => {
      const lng = parseFloat(target.longitude);
      const lat = parseFloat(target.latitude);

      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        flyTo(lng, lat);
      }

      setSelectedOffice(target);
      setModalVisible(true);
    },
    { dedupe: true },
  );

  function handleCloseModal() {
    setModalVisible(false);
    setSelectedOffice(null);
    navigation.setParams({ officeId: undefined });
  }

  return (
    <View style={styles.container}>
      {isDataLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#900000" />
        </View>
      )}

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

      <View ref={mapContainerRef} style={styles.map} />

      <OfficeModal visible={modalVisible} onClose={handleCloseModal} office={selectedOffice} />
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
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingLeft: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#000",
  },
  iconContainer: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 220,
  },
  dropdownItem: {
    padding: 15,
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
});
