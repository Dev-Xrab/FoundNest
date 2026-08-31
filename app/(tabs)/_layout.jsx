import { isLoggedIn } from "@/constants/StudentData";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { API_BASE_URL } from "@/constants/api";

import CustomHeader from "@/components/CustomHeader";
import CustomTabBar from "@/components/CustomTabBar";
import AppColors from "@/constants/AppColors";
import { getIsAnalyzing } from "@/constants/lostReports";
import { getToken, getUser } from "@/constants/StudentData";
import * as Notifications from "expo-notifications";
import { fetchWithAuth } from "@/constants/authApi";
import { useToast } from "@/context/ToastContext";
import { useReportLeaveGuard } from "@/hooks/useReportLeaveGuard";

// Set the handler OUTSIDE of your component
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});


export default function TabLayout() {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const { guardedNavigate, LeaveGuardModal } = useReportLeaveGuard();

  // The notification listener effect below only subscribes once ([] deps)
  // to avoid resubscribing on every pathname change, so it reads
  // guardedNavigate through a ref to always call the current version
  // instead of the one captured at mount time.
  const guardedNavigateRef = useRef(guardedNavigate);
  useEffect(() => {
    guardedNavigateRef.current = guardedNavigate;
  }, [guardedNavigate]);

  // ── AI ANALYSIS NAVIGATION BLOCKER ──
  const analyzingLastPath = useRef(pathname);
  const isAnalyzingResetting = useRef(false);

useEffect(() => {
  // Shared logic: look up match details and navigate
  const handleMatchNavigation = async (data) => {
    const { matchId, type } = data;

    if (type !== "MATCH_FOUND" || !matchId) {
      console.warn("Unhandled or incomplete notification payload:", data);
      return;
    }

    try {
      const user = await getUser();
      if (!user) return;

      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/notifications/user/${user.user_id}`
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch notifications, status ${res.status}`);
      }

      const allNotifications = await res.json();
      const matchData = allNotifications.find(
        (n) => n.match_id === Number(matchId)
      );

      if (!matchData) {
        console.warn("No notification found for matchId:", matchId);
        return;
      }

      guardedNavigateRef.current(() =>
        router.push({
          pathname: "/profileReportHistoryView",
          params: { match: JSON.stringify(matchData) },
        })
      );
    } catch (err) {
      console.error("Failed to handle match notification:", err);
    }
  };
  
  // 1. Fires when a notification arrives while the app is in the foreground.
  //    This is display-only — the user hasn't interacted with it yet, so it
  //    must NOT trigger navigation (that would yank them off their current screen).
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data;
      console.log(
        "Foreground Notification Data:", data
      );
    }
  );

  // 2. Fires when the user taps the notification while the app is running
  //    (foreground or backgrounded). This is where navigation belongs.
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      console.log("Notification Response Data (Tapped):", data);
      handleMatchNavigation(data);
    }
  );

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}, []);


  // Authentication Check
  useEffect(() => {
    isLoggedIn().then((result) => {
      setLoggedIn(result);
      setAuthChecked(true);
    });
  }, [pathname]);

  // Block navigation away from whichever screen is mid AI-photo-analysis
  useEffect(() => {
    if (isAnalyzingResetting.current) {
      analyzingLastPath.current = pathname;
      isAnalyzingResetting.current = false;
      return;
    }

    if (getIsAnalyzing() && pathname !== analyzingLastPath.current) {
      isAnalyzingResetting.current = true;
      showToast("Please wait until the photo analysis finishes.");
      router.replace(analyzingLastPath.current);
      return;
    }

    analyzingLastPath.current = pathname;
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
    <View style={{ flex: 1 }}>
      {/* Confirm-before-leaving modal for the notification-tap navigation above */}
      {LeaveGuardModal}

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