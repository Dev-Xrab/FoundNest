import * as Location from "expo-location";
import { useEffect, useState } from "react";

/**
 * Requests foreground location permission and wakes the GPS so the native
 * map can show the user's live position. Native-only — the web map has no
 * device GPS marker.
 */
export function useMapLocation() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isWakingGPS, setIsWakingGPS] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    async function activateAndFetchGPS() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          setPermissionDenied(true);
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

  return { hasPermission, isWakingGPS, permissionDenied };
}
