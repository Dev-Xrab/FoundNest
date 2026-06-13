import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Imports needed for your API logic
import FoundNestLogo from "@/assets/images/app-logo.png";
import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import { fetchWithAuth } from "@/constants/authApi";
import { getUser } from "@/constants/StudentData";

export default function CustomHeader({ title }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [numberOfUnreadNotifications, setNumberOfUnreadNotifications] =
    useState(0);
  const [notifications, setNotifications] = useState([]); // Fixed: added missing state
  const [loading, setLoading] = useState(true); // Fixed: added missing state

  function openNotifications() {
    router.push("/allNotification");
  }

  const getNotifications = async () => {
    try {
      const user = await getUser();
      const userId = user ? user.user_id : null;

      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/notifications/user/${userId}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNumberOfUnreadNotifications(data.filter((n) => !n.is_read).length);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getNotifications();
  }, []);

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.logoContainer}>
          <Image
            source={FoundNestLogo}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>{title}</Text>

        <View style={styles.spacer} />

        <Pressable
          onPress={openNotifications}
          style={styles.bellButton}
          accessibilityRole="button"
          accessibilityLabel="allNotification"
        >
          <View style={styles.iconWrapper}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={AppColors.background}
            />
            {/* Conditional styling: Renders red dot if count is greater than 0 */}
            {numberOfUnreadNotifications > 0 && (
              <View style={styles.badgeDot} />
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  bar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  logoContainer: {
    width: 65,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: 75,
    height: 75,
    marginLeft: -20,
    marginRight: -20,
  },
  title: {
    color: AppColors.background,
    fontSize: 18,
    fontWeight: "700",
  },
  spacer: {
    flex: 1,
  },
  bellButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapper: {
    position: "relative", // Keeps the dot context inside the icon area
  },
  badgeDot: {
    position: "absolute",
    right: 2,
    top: 2,
    backgroundColor: "#EF4444", // Red dot color
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: AppColors.surface, // Gives it a clean cutout visual appearance against your header background
  },
});
