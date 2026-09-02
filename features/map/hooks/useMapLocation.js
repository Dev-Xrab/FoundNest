import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

/**
 * Requests foreground location permission and wakes the GPS so the native
 * map can show the user's live position. Native-only — the web map has no
 * device GPS marker.
 *
 * Re-checks on every screen focus rather than just once on mount, so a
 * permission granted here and later revoked from the phone's Settings (or
 * the reverse — denied here, then granted from Settings) is picked up as
 * soon as the user comes back to this tab, without needing to relaunch the
 * app.
 */
export function useMapLocation() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isWakingGPS, setIsWakingGPS] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function activateAndFetchGPS() {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (cancelled) return;

          if (status !== "granted") {
            setHasPermission(false);
            setPermissionDenied(true);
            setIsWakingGPS(false);
            return;
          }

          setPermissionDenied(false);
          setHasPermission(true);

          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (err) {
          console.warn("GPS lock failed:", err);
        } finally {
          if (!cancelled) setIsWakingGPS(false);
        }
      }

      activateAndFetchGPS();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return { hasPermission, isWakingGPS, permissionDenied };
}
