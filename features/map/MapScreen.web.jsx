import AppColors from "@/constants/AppColors";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { createElement, useState } from "react";
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

const BULSU_CENTER = { lng: 120.8142, lat: 14.8582 };

function buildMapUrl(lat, lng) {
  const delta = 0.01;
  const bbox = [
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta,
  ].join("%2C");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

/** Web version of the map tab. Same search + office modal, browser map instead of MapLibre. */
export default function MapScreenWeb() {
  const navigation = useNavigation();
  const { colleges, isLoading: isDataLoading } = useColleges();

  const [selectedOffice, setSelectedOffice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [mapCenter, setMapCenter] = useState(BULSU_CENTER);

  const {
    searchQuery,
    filteredColleges,
    isDropdownVisible,
    setIsDropdownVisible,
    handleSearch,
    toggleDropdown,
    handleSelectLocation,
  } = useOfficeSearch(colleges, (lng, lat, college) => {
    setMapCenter({ lng, lat });
    setSelectedOffice(college);
    setModalVisible(true);
  });

  useOfficeParamSync(
    colleges,
    (target) => {
      const lng = parseFloat(target.longitude);
      const lat = parseFloat(target.latitude);

      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        setMapCenter({ lng, lat });
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

      <View style={styles.map}>
        {createElement("iframe", {
          title: "FoundNest campus map",
          src: buildMapUrl(mapCenter.lat, mapCenter.lng),
          // Pass standard HTML styles as plain string or native styles attribute wrapper
          style: "width: 100%; height: 100%; border: 0;",
        })}
      </View>

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
