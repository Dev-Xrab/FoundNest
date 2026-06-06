import {
  Camera,
  Map,
  Marker,
  NativeUserLocation,
} from "@maplibre/maplibre-react-native";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import OfficeModal from "./officeModal";
// Import the fetch function you created (adjust the path to match your project structure)
import fetchBulsuColleges from "@/constants/centerLocation";

const BULSU_CENTER = [120.8142, 14.8582];

// I chose a nice standard Map Pin Red. You can change this to any hex code!
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
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [colleges, setColleges] = useState([]);

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

  // 2. Fetch Colleges Data from your backend
  useEffect(() => {
    async function loadColleges() {
      const data = await fetchBulsuColleges();
      if (data && data.length > 0) {
        setColleges(data);
        console.log("Colleges loaded:", data);
      }
    }

    loadColleges();
  }, []);

  function handleMarkerPress(college) {
    setSelectedOffice(college);
    console.log("Selected office:", college);
    setModalVisible(true);
  }

  function handleCloseModal() {
    setModalVisible(false);
    setSelectedOffice(null);
  }

  return (
    <View style={styles.container}>
      {isWakingGPS && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#900000" />
        </View>
      )}

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

        {/* Filter out nulls, then render the markers */}
        {colleges
          .filter(
            (college) =>
              college.longitude !== null && college.latitude !== null,
          )
          .map((college) => {
            // 1. Convert the string coordinates to actual numbers
            const lng = parseFloat(college.longitude);
            const lat = parseFloat(college.latitude);

            // 2. Double-check that the conversion worked (safeguard)
            if (isNaN(lng) || isNaN(lat)) return null;

            return (
              <Marker
                key={college.office_id}
                id={college.office_id.toString()}
                lngLat={[lng, lat]} // Now passing clean Numbers!
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
    backgroundColor: MARKER_COLOR, // Hardcoded red color
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
    borderTopColor: MARKER_COLOR, // Hardcoded red color
    marginTop: -1.5,
  },
});
