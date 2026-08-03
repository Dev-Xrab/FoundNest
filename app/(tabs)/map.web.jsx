import AppColors from "@/constants/AppColors";
import { fetchBulsuColleges } from "@/constants/centerLocation";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { createElement, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import OfficeModal from "./officeModal";

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
  const { officeId } = useLocalSearchParams();

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredColleges, setFilteredColleges] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [mapCenter, setMapCenter] = useState(BULSU_CENTER);
  const lastProcessedIdRef = useRef(null);

  useEffect(() => {
    async function loadColleges() {
      try {
        const data = await fetchBulsuColleges();
        if (data?.length > 0) {
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

  useEffect(() => {
    function processIncomingOffice() {
      if (!officeId || colleges.length === 0) return;
      if (lastProcessedIdRef.current === officeId) return;

      const target = colleges.find(
        (college) => college?.office_id?.toString() === officeId.toString(),
      );

      if (!target) return;

      const lng = parseFloat(target.longitude);
      const lat = parseFloat(target.latitude);

      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        setMapCenter({ lng, lat });
      }

      setSelectedOffice(target);
      setModalVisible(true);
      lastProcessedIdRef.current = officeId;
    }

    processIncomingOffice();

    const unsubscribe = navigation.addListener("focus", processIncomingOffice);
    return unsubscribe;
  }, [officeId, colleges, navigation]);

  function handleSearch(text) {
    setSearchQuery(text);

    if (!text) {
      setFilteredColleges([]);
      setIsDropdownVisible(false);
      return;
    }

    const filtered = colleges.filter((college) =>
      college.office_name.toLowerCase().includes(text.toLowerCase()),
    );
    setFilteredColleges(filtered);
    setIsDropdownVisible(true);
  }

  function toggleDropdown() {
    if (isDropdownVisible) {
      setIsDropdownVisible(false);
      return;
    }

    if (searchQuery.trim() === "") {
      setFilteredColleges(colleges);
    } else {
      setFilteredColleges(
        colleges.filter((college) =>
          college.office_name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      );
    }
    setIsDropdownVisible(true);
  }

  function handleSelectLocation(college) {
    const lng = parseFloat(college.longitude);
    const lat = parseFloat(college.latitude);

    if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
      setMapCenter({ lng, lat });
    }

    setSearchQuery(college.office_name);
    setIsDropdownVisible(false);
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
