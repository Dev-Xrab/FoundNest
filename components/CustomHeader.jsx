import Ionicons from "@expo/vector-icons/Ionicons";
import NetInfo from "@react-native-community/netinfo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoundNestLogo from "@/assets/images/app-logo.png";
import AppColors from "@/constants/AppColors";
import { getUserNotifications } from "@/constants/notifications";
import { useReportLeaveGuard } from "@/hooks/useReportLeaveGuard";

export default function CustomHeader({ title }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guardedNavigate, LeaveGuardModal } = useReportLeaveGuard();

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
    guardedNavigate(() => router.push("/allNotification"));
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

      {LeaveGuardModal}
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
            {numberOfUnreadNotifications > 0 && (
              <View style={styles.badgeDot} />
            )}
          </View>
        </Pressable>
      </View>

      {!online && (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOutUp.duration(180)}
          style={styles.offlineBanner}
        >
          <Ionicons name="cloud-offline-outline" size={14} color="#FFFFFF" />
          <Text style={styles.offlineText}>You're offline</Text>
        </Animated.View>
      )}
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
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 5,
    backgroundColor: "#EF4444",
  },
  offlineText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
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