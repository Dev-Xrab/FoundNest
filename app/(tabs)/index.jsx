import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import { fetchWithAuth } from "@/constants/authApi";
import { getUser } from "@/constants/StudentData";
import registerForPushNotificationsAsync from "@/utils/tokenMaker";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import Alert from "react-native/Libraries/Alert/Alert";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HORIZONTAL_PADDING = 20;
const CARD_HEIGHT = 220;
const RECENT_FINDS_LIMIT = 5;

function formatFoundDate(iso) {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  return `${datePart} | ${timePart}`;
}

function RecentFindsCarousel({ items, activeIndex, onIndexChange }) {
  const handleScroll = useCallback(
    (event) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      if (clamped !== activeIndex) {
        onIndexChange(clamped);
      }
    },
    [activeIndex, items.length, onIndexChange],
  );

  if (items.length === 0) return null;

  return (
    <View style={carouselStyles.wrapper}>
      <ScrollView
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEnabled={items.length > 1}
        style={carouselStyles.scroll}
        contentContainerStyle={carouselStyles.scrollContent}
      >
        {items.map((item) => (
          <View
            key={String(item.found_report_id ?? item.item_id)}
            style={carouselStyles.slide}
          >
            <ImageBackground
              source={{ uri: item.image_url }}
              style={carouselStyles.card}
              imageStyle={carouselStyles.cardImage}
            >
              <View style={carouselStyles.overlay}>
                <Text style={carouselStyles.itemName}>{item.item_name}</Text>
                <View style={carouselStyles.divider} />
                <View style={carouselStyles.metaRow}>
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                  <Text style={carouselStyles.metaText}>
                    {formatFoundDate(item.found_date)}
                  </Text>
                </View>
                <View style={carouselStyles.metaRow}>
                  <Ionicons name="location-outline" size={16} color="#fff" />
                  <Text style={carouselStyles.metaText}>
                    {item.location_found}
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </View>
        ))}
      </ScrollView>

      {items.length > 1 && (
        <>
          <View style={carouselStyles.dots}>
            {items.map((report, index) => (
              <View
                key={report.found_report_id ?? report.item_id ?? index}
                style={[
                  carouselStyles.dot,
                  index === activeIndex && carouselStyles.dotActive,
                ]}
              />
            ))}
          </View>
          <Text style={carouselStyles.counter}>
            {activeIndex + 1} / {items.length}
          </Text>
        </>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [foundReports, setFoundReports] = useState([]);
  const [loadingFinds, setLoadingFinds] = useState(true);
  const [activeFindIndex, setActiveFindIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState("");

  // Simulated active user report data (Replace with dynamic state/backend fetch if needed)
  const [activeReport, setActiveReport] = useState({
    name: "Black Umbrella",
    hasMatch: true,
  });

  // Notifications Setup
  useEffect(() => {
    async function setupNotifications() {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      if (existingStatus === "denied") return;

      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;

        if (finalStatus !== "granted") {
          Alert.alert(
            "Permission Needed",
            "Please allow notifications so we can tell you when your lost item is found!",
          );
          return;
        }
      }

      if (finalStatus === "granted") {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setExpoPushToken(token);
          console.log("MY EXPO PUSH TOKEN:", token);
        }
      }
    }
    setupNotifications();
  }, []);

  useEffect(() => {
    getUser().then(setCurrentUser);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRecentFinds() {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/found-reports`);
        const contentType = res.headers.get("content-type") ?? "";

        if (!res.ok) throw new Error(`Found reports failed (${res.status})`);
        if (!contentType.includes("application/json")) {
          const body = await res.text();
          throw new Error(`Expected JSON but got: ${body.slice(0, 80)}`);
        }

        const data = await res.json();
        if (cancelled) return;

        const sorted = [...(Array.isArray(data) ? data : [])]
          .sort((a, b) => new Date(b.found_date) - new Date(a.found_date))
          .slice(0, RECENT_FINDS_LIMIT);
        setFoundReports(sorted);
        setActiveFindIndex(0);
      } catch (err) {
        if (!cancelled) {
          console.error("Recent finds:", err);
          setFoundReports([]);
        }
      } finally {
        if (!cancelled) setLoadingFinds(false);
      }
    }

    loadRecentFinds();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View>
        <Text style={styles.title}>
          Hello, {currentUser?.first_name ?? "there"}!
        </Text>
        <Text style={styles.title}>Searching for something?</Text>
        <View style={styles.separator} />

        <View style={styles.searchSection}>
          <Ionicons
            style={styles.searchIcon}
            name="search"
            size={20}
            color="#000"
          />
          <TextInput
            style={styles.input}
            onChangeText={setSearch}
            value={search}
            placeholder="Search the Nest (e.g, Wallet, Bag, etc...)"
          />
        </View>

        <Text style={styles.subtitle}>How can the Nest help you today?</Text>

        {/* Action Options Cards */}
        <View style={styles.choiceContainer}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/report")}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name="document-text-outline"
                size={55}
                color={AppColors.background}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Lost an Item?</Text>
              <Text style={styles.subTitleText}>
                File a detailed report to start the search.
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons
                name="chevron-forward-outline"
                size={24}
                color={AppColors.background}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.choiceContainer}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/find")}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="search" size={55} color={AppColors.background} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Looking for an Item?</Text>
              <Text style={styles.subTitleText}>
                Check for your lost item here!
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons
                name="chevron-forward-outline"
                size={24}
                color={AppColors.background}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.choiceContainer}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/map")}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name="location-outline"
                size={55}
                color={AppColors.background}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Found an Item?</Text>
              <Text style={styles.subTitleText}>
                Find authorized offices to surrender or claim an item
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons
                name="chevron-forward-outline"
                size={24}
                color={AppColors.background}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* NEW ADDITION: Lost Item Report Section */}
        {activeReport && (
          <View style={styles.lostReportSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lost Item Report</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/profileReportHistory")}
              >
                <Text style={styles.sectionLinkYellow}>
                  Go to My Reports &gt;
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reportCard}>
              <View style={styles.reportCardTop}>
                <View>
                  <Text style={styles.reportLabel}>Lost Item Name:</Text>
                  <Text style={styles.reportItemName}>{activeReport.name}</Text>
                </View>
                {activeReport.hasMatch && (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>
                      Potential Match Found!
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.reportCardDivider} />

              <View style={styles.reportCardBottom}>
                <TouchableOpacity
                  style={styles.reportActionBtn}
                  onPress={() => console.log("Edit report pressed")}
                >
                  <Ionicons name="create-outline" size={16} color="#900000" />
                  <Text style={styles.reportActionText}>Edit Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reportActionBtn}
                  onPress={() => router.push("/matches")}
                >
                  <Text style={styles.reportActionText}>View Matches</Text>
                  <Ionicons name="arrow-forward" size={16} color="#900000" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Recent Finds Section */}
        <View style={styles.recentFindsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Finds</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/(tabs)/find")}
            >
              <Text style={styles.sectionLinkYellow}>
                Go to Found Items &gt;
              </Text>
            </TouchableOpacity>
          </View>

          {loadingFinds ? (
            <ActivityIndicator
              color={AppColors.surface}
              style={styles.findsLoader}
            />
          ) : foundReports.length === 0 ? (
            <Text style={styles.emptyFindsText}>No found items yet.</Text>
          ) : (
            <RecentFindsCarousel
              items={foundReports}
              activeIndex={activeFindIndex}
              onIndexChange={setActiveFindIndex}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    padding: 20,
    paddingTop: 30,
  },
  title: {
    color: AppColors.surface,
    fontSize: 25,
    fontWeight: "900",
  },
  input: {
    flex: 1,
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 0,
    backgroundColor: "#fff",
    color: "#424242",
  },
  searchSection: {
    marginTop: 25,
    marginBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingHorizontal: 10,
    elevation: 10,
  },
  searchIcon: {
    color: AppColors.background,
    padding: 10,
  },
  subtitle: {
    color: AppColors.surface,
    fontSize: 20,
    fontWeight: "600",
    borderBottomColor: "#e4e4e473",
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  choiceContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF8F0",
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 4,
  },
  iconContainer: {
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#900000",
    marginBottom: 4,
  },
  subTitleText: {
    fontSize: 15,
    color: "#5C4A42",
    lineHeight: 20,
  },
  arrowContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  /* Styles for the new Lost Item Report Card module */
  lostReportSection: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    color: AppColors.surface,
    fontSize: 20,
    fontWeight: "700",
  },
  sectionLinkYellow: {
    color: "#F5D76E",
    fontSize: 14,
    fontWeight: "600",
  },
  reportCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reportLabel: {
    fontSize: 12,
    color: "#7a7a7a",
    fontWeight: "500",
  },
  reportItemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#900000",
    marginTop: 2,
  },
  matchBadge: {
    backgroundColor: "#FFD700",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#900000",
  },
  reportCardDivider: {
    height: 1,
    backgroundColor: "#EBEBEB",
    marginVertical: 14,
  },
  reportCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reportActionText: {
    color: "#900000",
    fontSize: 14,
    fontWeight: "600",
  },
  recentFindsSection: {
    marginTop: 28,
    paddingBottom: 24,
  },
  findsLoader: {
    marginVertical: 40,
  },
  emptyFindsText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    textAlign: "center",
    marginVertical: 24,
  },
});

const carouselStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: -CARD_HORIZONTAL_PADDING,
    marginBottom: 45,
  },
  scroll: {
    height: CARD_HEIGHT,
  },
  scrollContent: {
    alignItems: "center",
  },
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    height: CARD_HEIGHT,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardImage: {
    borderRadius: 16,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
  },
  dot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    backgroundColor: "#FFF8F0",
    width: 40,
  },
  counter: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
