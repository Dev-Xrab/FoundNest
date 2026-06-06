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
        options={{ href: null, headerShown: false }}
      />

      <Tabs.Screen
        name="officeModal"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="reportNextPage"
        options={{ title: "Report", href: null }}
      />

      {/* Profile sub-screens — hide tab header; each screen uses its own back header */}
      <Tabs.Screen
        name="profileAccountDetails"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="profileChangePassword"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen name="qrItem" options={{ href: null, headerShown: false }} />
      <Tabs.Screen
        name="qrItemRegister"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="qrItemList"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="qrItemScan"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="qrItemView"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="qrItemEdit"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="qrItemSuccess"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}
