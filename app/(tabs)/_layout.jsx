import { isLoggedIn } from "@/constants/StudentData";
import { Redirect, Tabs, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import CustomHeader from "@/components/CustomHeader";
import CustomTabBar from "@/components/CustomTabBar";
import AppColors from "@/constants/AppColors";

import * as Notifications from "expo-notifications";

// Set the handler OUTSIDE of your component
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function TabLayout() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const pathname = usePathname();

  // Authentication Check
  useEffect(() => {
    isLoggedIn().then((result) => {
      setLoggedIn(result);
      setAuthChecked(true);
    });
  }, [pathname]);

  // Still checking SecureStore — show a spinner
  if (!authChecked) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: AppColors.background,
        }}
      >
        <ActivityIndicator size="large" color={AppColors.surface} />
      </View>
    );
  }

  if (!loggedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        tabBarShowLabel: false,
        header: ({ options }) => <CustomHeader title={options.title} />,
      }}
    >
      {/* Primary Visible Tabs */}
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="report" options={{ title: "Report" }} />
      <Tabs.Screen name="find" options={{ title: "Find" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />

      {/* Hidden Screens (href: null) */}
      <Tabs.Screen
        name="FoundItemDetails"
        options={{
          title: "Item Details",
          href: null,
        }}
      />

      <Tabs.Screen
        name="officeModal"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="reportNextPage"
        options={{
          title: "Report",
          href: null,
        }}
      />

      <Tabs.Screen
        name="profileAccountDetails"
        options={{
          title: "Account Details",
          href: null,
        }}
      />

      <Tabs.Screen
        name="profileChangePassword"
        options={{
          title: "Change Password",
          href: null,
        }}
      />
    </Tabs>
  );
}
