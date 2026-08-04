  import CancelReasonModal from "@/components/CancelReasonModal";
  import Toast from "@/components/Toast";
  import { API_BASE_URL } from "@/constants/api";
  import AppColors from "@/constants/AppColors";
  import { fetchWithAuth } from "@/constants/authApi";
  import { getCategories } from "@/constants/category";
  import { getReportHistory } from "@/constants/lostReports";
  import {
    getReportHistoryFilters,
    setReportHistoryFilters,
  } from "@/constants/reportHistoryFilters";
  import { getToken, getUser } from "@/constants/StudentData";
  import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
  import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
  import { useCallback, useEffect, useState } from "react";
  import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
  } from "react-native";
  import { useSafeAreaInsets } from "react-native-safe-area-context";

  // ── Nest illustration (empty state) ──────────────────────────────────────────
  const emptyNestBg = require("@/assets/images/Empty Nest/empty-nest-bg.png");
  const emptyNest = require("@/assets/images/Empty Nest/empty-nest.png");
  const upperLeft = require("@/assets/images/Empty Nest/upper-left.png");
  const upperRight = require("@/assets/images/Empty Nest/upper-right.png");
  const upperRightBee = require("@/assets/images/Empty Nest/upper-right-bee.png");

  function EmptyNestIllustration() {
    return (
      <View style={styles.nestWrapper}>
        <Image source={emptyNestBg} style={styles.nestBg} />
        <Image source={upperLeft} style={styles.upperLeft} />
        <Image source={upperRight} style={styles.upperRight} />
        <Image source={upperRightBee} style={styles.upperRightBee} />
        <Image source={emptyNest} style={styles.nestImage} />
      </View>
    );
  }

  // ── Filter chip ───────────────────────────────────────────────────────────────
  function FilterChip({ label, isActive, onPress }) {
    return (
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }


  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Formats a numeric lost_report_id into a display code, e.g. 46 → "RPT-00046"
  function formatReportId(id) {
    if (id === null || id === undefined) return "—";
    return `RPT-${String(id).padStart(5, "0")}`;
  }

  function formatFoundId(id) {
    if (id === null || id === undefined) return "—";
    return `SI-${String(id).padStart(5, "0")}`;
  }

  // ── Match card (shown when expanded) — vertical grid tile ────────────────────
  function MatchCard({ match, label, onPress }) {
    return (
      <View style={styles.matchCardWrapper}>
        {/* "Potential Match N" label sits above the card */}
        <Text style={styles.matchLabel}>{label}</Text>

        <TouchableOpacity
          style={styles.matchCard}
          onPress={onPress}
          activeOpacity={0.75}
        >
          {/* Square image + badge overlay */}
          <View style={styles.matchImageContainer}>
            {match.found_item_image ? (
              <Image
                source={{ uri: match.found_item_image }}
                style={styles.matchImage}
              />
            ) : (
              <View style={[styles.matchImage, styles.matchImageFallback]}>
                <MaterialCommunityIcons
                  name="image-off-outline"
                  size={28}
                  color="#B0A09A"
                />
              </View>
            )}

            {/* Category badge — white pill, bottom-right of image */}
            {match.found_category_name ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText} numberOfLines={1}>
                  {match.found_category_name}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Text info below image */}
          <View style={styles.matchInfo}>
            <Text style={styles.foundIdText}>
              {formatFoundId(match.found_report_id)}
            </Text>
            <Text style={styles.matchName} numberOfLines={2}>
              {match.found_item_name ?? "—"}
            </Text>
            <View style={styles.matchDivider} />
            <View style={styles.matchMeta}>
              <Ionicons
                name="calendar-outline"
                size={11}
                color={AppColors.textMuted}
              />
              <Text style={styles.matchMetaText} numberOfLines={1}>
                {formatDate(match.found_date)}
              </Text>
            </View>
            <View style={styles.matchMeta}>
              <Ionicons
                name="location-outline"
                size={11}
                color={AppColors.textMuted}
              />
              <Text style={styles.matchMetaText} numberOfLines={1}>
                {match.location_found ?? "—"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Report card ───────────────────────────────────────────────────────────────
  function ReportCard({ report, onCancel, router }) {
    const [expanded, setExpanded] = useState(false);
    const hasMatches = report.matches.length > 0;
    const isCancelled = report.status === "cancelled";

    const handleMatchPress = (match) => {
      console.log("Match pressed:", match);
      router.push({
        pathname: "/(tabs)/profileReportHistoryView",
        params: { match: JSON.stringify(match) },
      });
    };

    const handleViewReport = () => {
      router.push({
        pathname: "/(tabs)/profileReportHistoryEdit",
        params: {
          report: JSON.stringify(report),
          editSession: Date.now(),
          viewOnly: "true",
        },
      });
    };

    return (
      <View style={styles.reportCard}>
        {/* ── Top section: image + info + badge (pressable → view details) ── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleViewReport}
          style={styles.reportTop}
        >
          {report.lost_item_image ? (
            <Image
              source={{ uri: report.lost_item_image }}
              style={styles.reportImage}
            />
          ) : (
            <View style={[styles.reportImage, styles.reportImageFallback]}>
              <MaterialCommunityIcons
                name="image-off-outline"
                size={32}
                color="#B0A09A"
              />
            </View>
          )}

          <View style={styles.reportMeta}>
            {isCancelled ? (
                <View style={styles.cancelledBadge}>
                  <Text style={styles.cancelledBadgeText}>Cancelled</Text>
                </View>
              ) : report.status === "resolved" ? (
                <View style={styles.resolvedBadge}>
                  <Text style={styles.resolvedBadgeText}>Resolved</Text>
                </View>
              ) : (
                hasMatches && (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>Potential Match Found!</Text>
                  </View>
                )
              )}
            <Text style={styles.reportLabel}>Report ID:</Text>
            <Text style={styles.reportIdText}>
              {formatReportId(report.lost_report_id)}
            </Text>
            <Text style={styles.reportLabel}>Lost Item Name:</Text>
            <Text style={styles.reportItemName}>
              {report.lost_item_name ?? "—"}
            </Text>
            <Text style={styles.reportLabel}>Date Reported:</Text>
            <Text style={styles.reportDate}>{formatDate(report.lost_date)}</Text>
          </View>
        </TouchableOpacity>

        {/* ── Divider + View Matches toggle ── */}
        {hasMatches && !isCancelled && (
          <>
            <View style={styles.matchDividerLine} />
            <TouchableOpacity
              style={styles.viewMatchesButton}
              onPress={() => setExpanded((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewMatchesText}>
                {expanded ? "Hide Matches" : "View Matches"}
              </Text>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={AppColors.background}
              />
            </TouchableOpacity>
          </>
        )}

        {/* ── Match cards (expanded) — 2-per-row grid ── */}
        {expanded && !isCancelled && (
          <View style={styles.matchGrid}>
            {report.matches.map((match, index) => (
              <MatchCard
                key={match.notification_id}
                match={match}
                label={`Potential Match ${index + 1}`}
                onPress={() => handleMatchPress(match)}
              />
            ))}
          </View>
        )}

        {/* ── Action buttons (hidden once cancelled) ── */}
        {!isCancelled && report.status !== "resolved" && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/profileReportHistoryEdit",
                  params: {
                    report: JSON.stringify(report),
                    editSession: Date.now(),
                  },
                })
              }
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={16}
                color={AppColors.background}
              />
              <Text style={styles.editButtonText}>Edit Report</Text>
            </TouchableOpacity>
            {report.status === "open" && (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel Report</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────────────
  export default function ProfileReportHistory() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { toast: toastParam } = useLocalSearchParams();

    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [reportToCancel, setReportToCancel] = useState(null);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    // ── Filter state (seeded from the external store so it survives a
    // remount of this screen, e.g. after viewing/editing a report)
    const savedFilters = getReportHistoryFilters();
    const [searchQuery, setSearchQuery] = useState(savedFilters?.searchQuery ?? "");
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState(savedFilters?.selectedCategories ?? []);
    const [selectedStatuses, setSelectedStatuses] = useState(savedFilters?.selectedStatuses ?? []);
    const [activeMenu, setActiveMenu] = useState(savedFilters?.activeMenu ?? null); // 'category' | 'status' | null

    const STATUS_OPTIONS = ["open", "cancelled", "resolved"];

    // MULTI-SELECT TOGGLE LOGIC: CATEGORIES
    const toggleCategory = (cat) => {
      setSelectedCategories((prev) =>
        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
      );
    };

    // MULTI-SELECT TOGGLE LOGIC: STATUSES
    const toggleStatus = (status) => {
      setSelectedStatuses((prev) =>
        prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
      );
    };

    useEffect(() => {
      getCategories()
        .then((data) => setCategories(data.map((c) => c.category_name || c)))
        .catch((err) => console.error("Failed to load categories:", err));
    }, []);

    // Show toast if navigated back from Edit with cancel param
    useEffect(() => {
      if (toastParam === "editCancelled") {
        setToastMessage("Edit has been cancelled.");
        setToastVisible(true);
      }
    }, [toastParam]);

    useFocusEffect(
      useCallback(() => {
        loadReports();
      }, []),
    );

    // Keep the external store in sync so filters survive a remount
    useEffect(() => {
      setReportHistoryFilters({ searchQuery, selectedCategories, selectedStatuses, activeMenu });
    }, [searchQuery, selectedCategories, selectedStatuses, activeMenu]);

const loadReports = async () => {
  setIsLoading(true);
  try {
    // getReportHistory handles fetching online, saving to SQLite, and reading cached offline data
    const historyData = await getReportHistory();
    setReports(Array.isArray(historyData) ? historyData : []);
  } catch (err) {
    console.error("Load report history error:", err?.message ?? err);
    setReports([]);
  } finally {
    setIsLoading(false);
  }
};

    const handleCancelPress = (report) => {
      setReportToCancel(report);
      setCancelModalVisible(true);
    };

    const confirmCancel = async (reason) => {
      if (!reportToCancel) return;
      setCancelModalVisible(false);

      try {
        const res = await fetchWithAuth(
          `${API_BASE_URL}/api/lost-reports/${reportToCancel.lost_report_id}/cancel`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          },
        );
        if (res.ok) {
          // Keep the report visible — just mark it cancelled in place
          setReports((prev) =>
            prev.map((r) =>
              r.lost_report_id === reportToCancel.lost_report_id
                ? { ...r, status: "cancelled", cancel_reason: reason }
                : r,
            ),
          );
          setToastMessage("Report Cancelled. Thank you for your feedback!");
          setToastVisible(true);
        } else {
          const data = await res.json();
          console.error("Cancel report failed:", data.error);
        }
      } catch (err) {
        console.error("Cancel report error:", err);
      } finally {
        setReportToCancel(null);
      }
    };

    // ── Derived filtered list
    const filteredReports = reports.filter((r) => {
      const matchesSearch = !searchQuery.trim() ||
        (r.lost_item_name ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.some(
          (cat) => (r.category_name ?? "").toLowerCase() === cat.toLowerCase(),
        );
      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(r.status);
      return matchesSearch && matchesCategory && matchesStatus;
    });

    let categoryDisplayText = "Category";
    if (selectedCategories.length === 1) categoryDisplayText = selectedCategories[0];
    else if (selectedCategories.length > 1) categoryDisplayText = `${selectedCategories.length} Selected`;

    let statusDisplayText = "Status";
    if (selectedStatuses.length === 1) {
      statusDisplayText =
        selectedStatuses[0].charAt(0).toUpperCase() + selectedStatuses[0].slice(1);
    } else if (selectedStatuses.length > 1) {
      statusDisplayText = `${selectedStatuses.length} Selected`;
    }

    const hasActiveFilters =
      !!searchQuery || selectedCategories.length > 0 || selectedStatuses.length > 0;

    return (
      <View style={styles.screen}>
        <CancelReasonModal
          visible={cancelModalVisible}
          onKeepIt={() => {
            setCancelModalVisible(false);
            setReportToCancel(null);
          }}
          onConfirmCancel={confirmCancel}
        />

        {/* ── Red header ─────────────────────────────────────────────────── */}
        <View style={[styles.redHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.navigate("/(tabs)/profile")}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report History</Text>
          </View>
        </View>

        {/* ── Search bar + filters (hidden entirely when there's no report history) ── */}
        {!isLoading && reports.length > 0 && (
          <>
            {/* ── Search bar ─────────────────────────────────────────────── */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={AppColors.background} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search Item"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color="#B0A09A" />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Filter trigger bar ──────────────────────────────────────── */}
            <View style={styles.filterBar}>
              <View style={styles.filterContainer}>
                {/* Category trigger */}
                <TouchableOpacity
                  style={[styles.filterTrigger, (selectedCategories.length > 0 || activeMenu === "category") && styles.filterTriggerActive]}
                  onPress={() => setActiveMenu(activeMenu === "category" ? null : "category")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.filterTriggerText, selectedCategories.length > 0 && styles.filterTriggerTextActive]}
                    numberOfLines={1}
                  >
                    {categoryDisplayText}
                  </Text>
                  <Ionicons
                    name={activeMenu === "category" ? "chevron-up" : "chevron-down"}
                    size={13}
                    color={AppColors.background}
                  />
                </TouchableOpacity>

                {/* Status trigger */}
                <TouchableOpacity
                  style={[styles.filterTrigger, (selectedStatuses.length > 0 || activeMenu === "status") && styles.filterTriggerActive]}
                  onPress={() => setActiveMenu(activeMenu === "status" ? null : "status")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.filterTriggerText, selectedStatuses.length > 0 && styles.filterTriggerTextActive]}
                    numberOfLines={1}
                  >
                    {statusDisplayText}
                  </Text>
                  <Ionicons
                    name={activeMenu === "status" ? "chevron-up" : "chevron-down"}
                    size={13}
                    color={AppColors.background}
                  />
                </TouchableOpacity>

                {/* Clear all filters — always occupies its own fixed slot */}
                {hasActiveFilters && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setSearchQuery("");
                      setSelectedCategories([]);
                      setSelectedStatuses([]);
                      setActiveMenu(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={14} color={AppColors.background} />
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── Filter dropdowns ──────────────────────────────────────── */}
            {activeMenu === "category" && (
              <View style={styles.dropdownCard}>
                <View style={styles.chipRow}>
                  <FilterChip
                    label="All"
                    isActive={selectedCategories.length === 0}
                    onPress={() => { setSelectedCategories([]); setActiveMenu(null); }}
                  />
                  {categories.map((cat, i) => (
                    <FilterChip
                      key={`cat-${i}`}
                      label={cat}
                      isActive={selectedCategories.includes(cat)}
                      onPress={() => toggleCategory(cat)}
                    />
                  ))}
                </View>
              </View>
            )}

            {activeMenu === "status" && (
              <View style={styles.dropdownCard}>
                <View style={styles.chipRow}>
                  <FilterChip
                    label="All"
                    isActive={selectedStatuses.length === 0}
                    onPress={() => { setSelectedStatuses([]); setActiveMenu(null); }}
                  />
                  {STATUS_OPTIONS.map((s) => (
                    <FilterChip
                      key={s}
                      label={s.charAt(0).toUpperCase() + s.slice(1)}
                      isActive={selectedStatuses.includes(s)}
                      onPress={() => toggleStatus(s)}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* ── Body ───────────────────────────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={AppColors.background} />
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyNestIllustration />
            <Text style={styles.emptyTitle}>Nothing here yet!</Text>
            <Text style={styles.emptySubtitle}>
              Your report history is currently empty.{"\n"}Any new report you make
              will appear here.
            </Text>
          </View>
        ) : filteredReports.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="search-outline" size={48} color="#C5AFA7" />
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredReports.map((report) => (
              <ReportCard
                key={report.lost_report_id}
                report={report}
                router={router}
                onCancel={() => handleCancelPress(report)}
              />
            ))}
          </ScrollView>
        )}

        <Toast
          visible={toastVisible}
          type="info"
          message={toastMessage}
          onHide={() => setToastVisible(false)}
        />
      </View>
    );
  }

  // ── Styles ────────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#FFF1E0",
    },

    // ── Header
    redHeader: {
      backgroundColor: AppColors.background,
      paddingHorizontal: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 70,
    },
    backButton: {
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: "#FFFFFF",
      marginLeft: 4,
    },

    // ── Loading / empty
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingBottom: 120,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: AppColors.textOnLight,
      marginTop: 16,
      marginBottom: 10,
    },
    emptySubtitle: {
      fontSize: 14,
      color: AppColors.textMuted,
      textAlign: "center",
      lineHeight: 22,
    },

    // ── List
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 40,
      gap: 16,
    },

    // ── Search bar
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      marginHorizontal: 15,
      marginTop: 14,
      marginBottom: 10,
      paddingHorizontal: 15,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: "#ddd",
      height: 45,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: "#333",
    },

    // ── Filter bar — wraps triggers in a surface card like find.jsx
    filterBar: {
      marginBottom: 10,
      backgroundColor: AppColors.surface,
      paddingVertical: 10,
      marginHorizontal: 10,
      borderRadius: 15,
    },
    filterContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 10,
    },
    filterTrigger: {
      flex: 1,
      marginHorizontal: 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: "#ddd",
      // Prevents long text from pushing Clear off-screen
      minWidth: 0,
    },
    filterTriggerActive: {
      borderColor: AppColors.background,
    },
    filterTriggerText: {
      fontSize: 12,
      color: "#333",
      marginRight: 5,
      flexShrink: 1,
    },
    filterTriggerTextActive: {
      color: AppColors.background,
      fontWeight: "700",
    },
    clearButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      marginHorizontal: 4,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: "#ddd",
      // Fixed width so it never gets pushed off
      flexShrink: 0,
    },
    clearButtonText: {
      fontSize: 12,
      color: AppColors.background,
      fontWeight: "600",
    },

    // ── Filter dropdown card — matches find.jsx dropdownWhiteCard
    dropdownCard: {
      backgroundColor: "#FFFFFF",
      marginTop: 0,
      marginHorizontal: 10,
      marginBottom: 10,
      borderRadius: 12,
      padding: 15,
      borderWidth: 1,
      borderColor: "#eee",
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
    },
    filterChip: {
      backgroundColor: "#FFFFFF",
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
      marginHorizontal: 5,
      marginVertical: 5,
      borderWidth: 1,
      borderColor: "#eee",
    },
    filterChipActive: {
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: AppColors.background,
    },
    filterChipText: {
      fontSize: 13,
      color: "#333333",
      fontWeight: "600",
    },
    filterChipTextActive: {
      color: AppColors.background,
      fontWeight: "700",
    },

    // ── Report card
    reportCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    },
    reportTop: {
      flexDirection: "row",
      padding: 14,
      gap: 12,
    },
    reportImage: {
      width: 90,
      height: 90,
      borderRadius: 10,
      resizeMode: "cover",
    },
    reportImageFallback: {
      backgroundColor: "#EDE0D4",
      justifyContent: "center",
      alignItems: "center",
    },
    reportMeta: {
      flex: 1,
      justifyContent: "center",
    },
    matchBadge: {
      alignSelf: "flex-start",
      backgroundColor: "#F5C518",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginBottom: 8,
    },
    matchBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#1a1a1a",
    },
    cancelledBadge: {
      alignSelf: "flex-start",
      backgroundColor: "#D9D2CC",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginBottom: 8,
    },
    cancelledBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#5C5048",
    },
    resolvedBadge: {
      alignSelf: "flex-start",
      backgroundColor: "#C8E6C9",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginBottom: 8,
    },
    resolvedBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#2E7D32",
    },
    reportLabel: {
      fontSize: 12,
      color: AppColors.textMuted,
      marginTop: 2,
    },
    reportIdText: {
      fontSize: 14,
      fontWeight: "700",
      color: AppColors.textOnLight,
      marginBottom: 4,
    },
    reportItemName: {
      fontSize: 14,
      fontWeight: "700",
      color: AppColors.textOnLight,
      marginBottom: 4,
    },
    reportDate: {
      fontSize: 14,
      fontWeight: "600",
      color: AppColors.textOnLight,
    },

    // ── View Matches button (yellow)
    viewMatchesButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginHorizontal: 14,
      marginBottom: 12,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: "#F5C518",
    },
    viewMatchesText: {
      fontSize: 14,
      fontWeight: "700",
      color: AppColors.background,
    },
    matchDividerLine: {
      height: 1,
      backgroundColor: "rgba(0,0,0,0.07)",
      marginHorizontal: 14,
      marginBottom: 12,
    },

    // ── Match grid (2 per row)
    matchGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 14,
      paddingBottom: 4,
      gap: 10,
    },
    matchCardWrapper: {
      width: "47%",
    },
    matchLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: AppColors.textOnLight,
      marginBottom: 6,
    },
    matchCard: {
      backgroundColor: "#FAF6F2",
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.06)",
    },
    matchImageContainer: {
      width: "100%",
      aspectRatio: 1,
      position: "relative",
    },
    matchImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    matchImageFallback: {
      backgroundColor: "#EDE0D4",
      justifyContent: "center",
      alignItems: "center",
    },
    categoryBadge: {
      position: "absolute",
      bottom: 8,
      right: 8,
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
    categoryBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: AppColors.textOnLight,
    },
    matchInfo: {
      padding: 8,
      gap: 3,
    },
    matchDivider: {
      height: 1,
      backgroundColor: "rgba(0,0,0,0.08)",
      marginVertical: 4,
    },
    matchName: {
      fontSize: 12,
      fontWeight: "700",
      color: AppColors.textOnLight,
    },
    foundIdText: {
      fontSize: 11,
      fontWeight: "700",
      color: AppColors.background,
      marginBottom: 2,
    },
    matchMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    matchMetaText: {
      fontSize: 10,
      color: AppColors.textMuted,
      flexShrink: 1,
    },

    // ── Action buttons
    cardActions: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderColor: "rgba(0,0,0,0.07)",
      marginTop: 12,
    },
    editButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 13,
    },
    actionDivider: {
      width: 1,
      backgroundColor: "rgba(0,0,0,0.07)",
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: AppColors.background,
    },
    cancelButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 13,
      backgroundColor: AppColors.background,
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFFFFF",
    },

    // ── Empty nest illustration
    nestWrapper: {
      width: 280,
      height: 240,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    nestBg: {
      width: 280,
      height: 240,
      resizeMode: "contain",
      position: "absolute",
    },
    nestImage: {
      width: 170,
      height: 90,
      resizeMode: "contain",
      position: "absolute",
      bottom: 45,
    },
    upperLeft: {
      width: 55,
      height: 55,
      resizeMode: "contain",
      position: "absolute",
      left: 55,
      top: 55,
    },
    upperRight: {
      width: 55,
      height: 55,
      resizeMode: "contain",
      position: "absolute",
      right: 60,
      top: 35,
    },
    upperRightBee: {
      width: 20,
      height: 20,
      resizeMode: "contain",
      position: "absolute",
      right: 42,
      top: 25,
    },
  });