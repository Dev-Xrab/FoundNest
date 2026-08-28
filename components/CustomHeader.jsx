import Ionicons from "@expo/vector-icons/Ionicons";
import NetInfo from "@react-native-community/netinfo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoundNestLogo from "@/assets/images/app-logo.png";
import AppColors from "@/constants/AppColors";
import { getUserNotifications } from "@/constants/notifications";

export default function CustomHeader({ title }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [numberOfUnreadNotifications, setNumberOfUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  // Listen to network state changes reactively instead of polling every 5 seconds
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(isConnected);
    });

    return () => unsubscribe();
  }, []);

  function openNotifications() {
    router.push("/allNotification");
  }

  const getNotifications = async () => {
    try {
      const data = await getUserNotifications();
      if (Array.isArray(data)) {
        setNumberOfUnreadNotifications(data.filter((n) => !n.is_read).length);
        setNotifications(data);
      }
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
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <View style={styles.bar}>
        <View style={styles.logoContainer}>
          <Image
            source={FoundNestLogo}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>{title}</Text>

        {/* Dynamic Badge Color: Green (#22C55E) when Online | Red (#EF4444) when Offline */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: online ? "#22C55E" : "#EF4444" },
          ]}
        >
          <Text style={styles.statusText}>
            {online ? "Online" : "Offline"}
          </Text>
        </View>

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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
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
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    right: 2,
    top: 2,
    backgroundColor: "#EF4444",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: AppColors.surface,
  },
});