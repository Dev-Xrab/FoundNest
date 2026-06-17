import { isLoggedIn } from "@/constants/StudentData";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, View } from "react-native";

import CustomHeader from "@/components/CustomHeader";
import CustomTabBar from "@/components/CustomTabBar";
import ConfirmDiscardModal from "@/components/ConfirmDiscardModal"; 
import AppColors from "@/constants/AppColors";
import { getReportDraft, clearReportDraft } from "@/constants/reportDraft";

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
  const router = useRouter();
  
  // ── MODAL & NAVIGATION BLOCKER STATES ──
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingTargetRoute, setPendingTargetRoute] = useState(null);
  const isResetting = useRef(false); // Prevents the route checker from running when we force go back
  const lastPath = useRef(pathname);

  // Authentication Check
  useEffect(() => {
    isLoggedIn().then((result) => {
      setLoggedIn(result);
      setAuthChecked(true);
    });
  }, [pathname]);

  // Intercept route changes when a draft is modified
  useEffect(() => {
    const activeDraft = getReportDraft();

    // If we are currently forcing a snap-back to the report screen, skip the check
    if (isResetting.current) {
      if (pathname === "/report") {
        isResetting.current = false; // If we go back successfully yo report page it turns off
      }
      lastPath.current = pathname; // The last step to store the lastpath and skip the checking again
      return;
    }

    // Check if user is navigating away from the report wizard fields with an active draft
    if (
      activeDraft && 
      (lastPath.current === "/report" || lastPath.current === "/reportNextPage") &&
      pathname !== "/report" && 
      pathname !== "/reportNextPage"
    ) {
      // 1. Activate the route check lock
      isResetting.current = true;
      
      // 2. Temporarily store the tab route they clicked
      setPendingTargetRoute(pathname);
      
      // 3. Force them to stay on the report tab in the background
      router.push("/(tabs)/report");
      
      // 4. Open your custom modal overlay cleanly
      setModalVisible(true);
    } else {
      // Sync the tracking path if no alert conditions are met
      lastPath.current = pathname;
    }
  }, [pathname]);

  const handleConfirmDiscard = () => {
    setModalVisible(false);
    clearReportDraft(); // Wipe background cache data storage clean
    
    if (pendingTargetRoute) {
      isResetting.current = true; // Set lock to let this specific navigation through
      lastPath.current = pendingTargetRoute; 
      router.push(pendingTargetRoute); // Complete blocked navigation path move
      setPendingTargetRoute(null);
    }
  };

  const handleCancelDiscard = () => {
    setModalVisible(false);
    setPendingTargetRoute(null);
    isResetting.current = false; // Unlock standard behaviors
  };

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
    <View style={{ flex: 1 }}>
      {/* Custom Confirm Modal Layer */}
      <ConfirmDiscardModal
        visible={modalVisible}
        message="Discard changes? Unsaved edits will be lost."
        cancelLabel="Keep Editing"
        confirmLabel="Discard"
        onKeepEditing={handleCancelDiscard}
        onDiscard={handleConfirmDiscard}
      />

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

        {/* Profile sub-screens */}
        <Tabs.Screen
          name="profileAccountDetails"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="profileChangePassword"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="profileReportHistory"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="profileReportHistoryView"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen 
          name="profileReportHistoryEdit" 
          options={{ href: null, title: "Report" }} 
        />
        <Tabs.Screen 
          name="profileReportHistoryEditNext" 
          options={{ href: null, title: "Report" }} 
        />
        <Tabs.Screen 
          name="reportSuccess" 
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
    </View>
  );
}