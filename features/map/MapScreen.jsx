import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import AppColors from "@/constants/AppColors";
import { Ionicons } from "@expo/vector-icons";
import {
  Camera,
  Map,
  Marker,
  NativeUserLocation,
} from "@maplibre/maplibre-react-native";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import OfficeMarkerPin from "./components/OfficeMarkerPin";
import OfficeModal from "./components/OfficeModal";
import { useColleges } from "./hooks/useColleges";
import { useMapLocation } from "./hooks/useMapLocation";
import { useOfficeParamSync } from "./hooks/useOfficeParamSync";
import { useOfficeSearch } from "./hooks/useOfficeSearch";

const BULSU_CENTER = [120.8142, 14.8582];

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
  const { colleges, isLoading: isDataLoading } = useColleges();
  const { hasPermission, isWakingGPS, permissionDenied } = useMapLocation();

  const [selectedOffice, setSelectedOffice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // --- Confirm Discard Modal Config State ---
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    message: "",
    cancelLabel: "Cancel",
    confirmLabel: "OK",
    onConfirm: () => {},
  });

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

  useEffect(() => {
    if (permissionDenied) {
      showCustomAlert({
        message:
          "Location Access Needed: FoundNest can still show campus offices, but enable location to view your live distance.",
        cancelLabel: "Dismiss",
        confirmLabel: "Got It",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionDenied]);

  const [cameraConfig, setCameraConfig] = useState({
    center: BULSU_CENTER,
    zoom: 17,
    animationDuration: 2000,
  });

  const {
    searchQuery,
    filteredColleges,
    isDropdownVisible,
    setIsDropdownVisible,
    handleSearch,
    toggleDropdown,
    requestClearSearch,
    handleSelectLocation,
  } = useOfficeSearch(colleges, (lng, lat) => {
    setCameraConfig({ center: [lng, lat], zoom: 19, animationDuration: 1500 });
  });

  useOfficeParamSync(colleges, (target) => {
    const lng = parseFloat(target.longitude);
    const lat = parseFloat(target.latitude);

    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      setCameraConfig({ center: [lng, lat], zoom: 19, animationDuration: 1500 });
    }

    setSelectedOffice(target);
    setModalVisible(true);
  });

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
                <OfficeMarkerPin label={college.office_name} />
              </Marker>
            );
          })}
      </Map>

      {/* Office Details Modal mounted only when office data exists */}
      {selectedOffice && (
        <OfficeModal
          visible={modalVisible}
          onClose={handleCloseModal}
          office={selectedOffice}
        />
      )}

      {/* Reusable Alert/Confirmation Modal */}
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
});
