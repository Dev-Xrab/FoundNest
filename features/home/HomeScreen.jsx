import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppColors from "@/constants/AppColors";
import { getUser } from "@/constants/StudentData";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import HomeActionCard from "./components/HomeActionCard";
import RecentFindsCarousel from "./components/RecentFindsCarousel";
import { useLostReportSpotlight } from "./hooks/useLostReportSpotlight";
import { useRecentFinds } from "./hooks/useRecentFinds";

const ACTION_CARDS = [
  {
    key: "report",
    icon: "document-text-outline",
    title: "Lost an Item?",
    subtitle: "File a detailed report to start the search.",
    route: "/(tabs)/report",
  },
  {
    key: "find",
    icon: "search",
    title: "Looking for an Item?",
    subtitle: "Check for your lost item here!",
    route: "/(tabs)/find",
  },
  {
    key: "map",
    icon: "location-outline",
    title: "Found an Item?",
    subtitle: "Find authorized offices to surrender or claim an item",
    route: "/(tabs)/map",
  },
];

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [activeFindIndex, setActiveFindIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  const { displayReport, loading: loadingReport } = useLostReportSpotlight(
    currentUser?.user_id,
  );
  const { items: foundReports, loading: loadingFinds } = useRecentFinds();

  useEffect(() => {
    getUser().then(setCurrentUser);
  }, []);

  useEffect(() => {
    setActiveFindIndex(0);
  }, [foundReports.length]);

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
            placeholderTextColor={"#9e9e9e"}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (search.trim()) {
                router.push({
                  pathname: "/(tabs)/find",
                  params: { initialQuery: search.trim() },
                });
              }
              setSearch("");
            }}
          />
        </View>

        <Text style={styles.subtitle}>How can the Nest help you today?</Text>

        {/* Action Options Cards */}
        {ACTION_CARDS.map((card) => (
          <HomeActionCard
            key={card.key}
            icon={card.icon}
            title={card.title}
            subtitle={card.subtitle}
            onPress={() => router.push(card.route)}
          />
        ))}

        {/* Lost Item Report Card */}
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

          {loadingReport ? (
            <ActivityIndicator
              color={AppColors.surface}
              style={{ marginVertical: 20 }}
            />
          ) : displayReport ? (
            <View style={styles.reportCard}>
              <View style={styles.reportCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportLabel}>Lost Item Name:</Text>
                  <Text style={styles.reportItemName}>
                    {displayReport.lost_item_name ?? "—"}
                  </Text>
                </View>
                {displayReport.matches?.length > 0 && (
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
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/profileReportHistoryEdit",
                      params: {
                        report: JSON.stringify(displayReport),
                        editSession: Date.now(),
                      },
                    })
                  }
                >
                  <Ionicons name="create-outline" size={16} color="#900000" />
                  <Text style={styles.reportActionText}>Edit Report</Text>
                </TouchableOpacity>

                {displayReport.matches?.length > 0 && (
                  <TouchableOpacity
                    style={styles.reportActionBtn}
                    activeOpacity={0.7}
                    onPress={() => router.push("/profileReportHistory")}
                  >
                    <Text style={styles.reportActionText}>View Matches</Text>
                    <Ionicons name="arrow-forward" size={16} color="#900000" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noneContainer}>
              <Text style={styles.noneText}>None</Text>
            </View>
          )}
        </View>

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
            <Text style={styles.emptyFindsText}>
              No items available — they may have already been surrendered.
            </Text>
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
  separator: {
    height: 1,
    backgroundColor: "transparent",
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
    alignItems: "center",
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
  noneContainer: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  noneText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontWeight: "bold",
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
    marginBottom: 70,
  },
});
