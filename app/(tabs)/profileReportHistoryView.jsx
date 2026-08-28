import NavigationBackHandler from "@/components/NavigationBackHandler";
import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import { fetchWithAuth } from "@/constants/authApi";
import { goBack } from "@/constants/previousPage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


// ── Helpers ───────────────────────────────────────────────────────────────────
function formatReportId(id) {
  if (id === null || id === undefined) return "—";
  return `RPT-${String(id).padStart(5, "0")}`;
}

function formatFoundId(id) {
  if (id === null || id === undefined) return "—";
  return `SI-${String(id).padStart(5, "0")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "Not specified";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "Not specified";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function orNA(val) {
  if (!val || String(val).trim() === "" || val === "N/A") return null;
  return val;
}

// Handles location values that may be stored as a JSON-stringified array
// (e.g. '["Alvarado Hall","Pimentel Hall"]') by parsing and joining them
// into a readable comma-separated string. Plain strings pass through as-is.
function formatLocation(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) return arr.join(", ");
    } catch (e) {
      // not valid JSON, fall through to raw string
    }
  }
  return str;
}

// ── Image viewer modal ────────────────────────────────────────────────────────
function ImageModal({ uri, visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Image
          source={{ uri }}
          style={styles.modalImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Modal>
  );
}

// ── Comparison image box ──────────────────────────────────────────────────────
function CompareImage({ uri, label }) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.compareImageWrapper}>
      <Text style={styles.compareLabel}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => uri && setModalVisible(true)}
        style={styles.compareImageBox}
      >
        {uri ? (
          <>
            <Image source={{ uri }} style={styles.compareImage} />
            <View style={styles.expandIcon}>
              <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
            </View>
          </>
        ) : (
          <View style={styles.compareImageFallback}>
            <Ionicons name="image-outline" size={32} color="#B0A09A" />
          </View>
        )}
      </TouchableOpacity>

      {uri && (
        <ImageModal
          uri={uri}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      )}
    </View>
  );
}

// ── Comparison table row ──────────────────────────────────────────────────────
function TableRow({ label, yourValue, matchValue, isLast }) {
  const yours = orNA(yourValue);
  const theirs = orNA(matchValue);

  return (
    <View style={[styles.tableRow, isLast && styles.tableRowLast]}>
      <View style={styles.tableLabelCell}>
        <Text style={styles.tableLabelText}>{label}</Text>
      </View>
      <View style={styles.tableValueCell}>
        <Text style={[styles.tableValueText, !yours && styles.tableValueMuted]}>
          {yours ?? "Not specified"}
        </Text>
      </View>
      <View style={[styles.tableValueCell, styles.tableValueCellRight]}>
        <Text
          style={[styles.tableValueText, !theirs && styles.tableValueMuted]}
        >
          {theirs ?? "Not specified"}
        </Text>
      </View>
    </View>
  );
}

// ── How to Claim bottom sheet ─────────────────────────────────────────────────
function HowToClaimSheet({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sheetOverlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>How to Claim?</Text>

          <Text style={styles.stepTitle}>Step 1: Bring Proof</Text>
          <Text style={styles.stepBody}>
            Please bring your BulSU Student ID/COR/or any form of identification
            and be ready to provide proof of ownership (e.g., describing a
            unique detail on an item, showing a photo of you while holding the
            item, or unlocking the item for devices).
          </Text>

          <Text style={styles.stepTitle}>Step 2: Visit the Office</Text>
          <Text style={styles.stepBody}>
            Proceed to the FoundNest Office listed on the item details.
          </Text>

          <Text style={styles.stepTitle}>Step 3: Final Photo</Text>
          <Text style={styles.stepBody}>
            Our staff will take a quick photo of the turnover for our security
            records and to finalize the process.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileReportHistoryView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { match: matchParam } = useLocalSearchParams();

  // Instant render from the passed-in object — unchanged behavior
  const [match, setMatch] = useState(matchParam ? JSON.parse(matchParam) : {});

  const [claimSheetVisible, setClaimSheetVisible] = useState(false);

  // Silently refresh in the background once the screen is up, so the
  // cached/passed-in snapshot never goes stale without the user knowing.

// ── Sync state when new params arrive ──
  useEffect(() => {
    if (matchParam) {
      try {
        setMatch(JSON.parse(matchParam));
      } catch (e) {
        console.error("Failed to parse match param:", e);
      }
    }
  }, [matchParam]);
  
  useEffect(() => {
    if (!match.match_id) return;

    const refreshMatch = async () => {
      try {
        const response = await fetchWithAuth(
          `${API_BASE_URL}/api/match-records/${match.match_id}/match`,
        );

        if (!response.ok) return; // keep showing cached data, fail silently

        const fresh = await response.json();
        console.log(fresh)
        setMatch(fresh);
      } catch (err) {
        console.warn("Background match refresh failed:", err.message);
        // no user-facing error — cached data stays on screen
      }
    };

    refreshMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.match_id]);

  // Derived display values
  const officeDisplay = orNA(match.office_name)
    ? `${match.office_name}${orNA(match.office_location) ? `\n${match.office_location}` : ""}`
    : null;

  return (
    <View style={styles.screen}>
      {
        console.log("ImageLink: ",match.lost_image_url)
      }
      <HowToClaimSheet
        visible={claimSheetVisible}
        onClose={() => setClaimSheetVisible(false)}
      />

      {/* ── Red header ─────────────────────────────────────────────────── */}
      <View style={[styles.redHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() =>{
             goBack(router)
            } }
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Potential Match ({formatFoundId(match.found_report_id)})
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image Comparison ───────────────────────────────────────────── */}
        <View style={styles.sectionDividerRow}>
          <View style={styles.sectionDividerLine} />
          <Text style={styles.sectionTitle}>Image Comparison</Text>
          <View style={styles.sectionDividerLine} />
        </View>

        <View style={styles.imageCard}>
          <View style={styles.imageRow}>
            <CompareImage uri={match.lost_image_url} label="Your Image" />
            <CompareImage
              uri={match.found_image_url}
              label="Potential Match"
            />
          </View>
        </View>

        {/* ── Description Comparison ─────────────────────────────────────── */}
        <View style={styles.sectionDividerRow}>
          <View style={styles.sectionDividerLine} />
          <Text style={styles.sectionTitle}>Item Description Comparison</Text>
          <View style={styles.sectionDividerLine} />
        </View>
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <View style={styles.tableLabelCell} />
            <View style={[styles.tableValueCell, styles.tableHeaderRight]}>
              <Text style={styles.tableHeaderText}>Your Report</Text>
            </View>
            <View
              style={[
                styles.tableValueCell,
                styles.tableValueCellRight,
                styles.tableHeaderRight,
              ]}
            >
              <Text style={styles.tableHeaderText}>Potential Match</Text>
            </View>
          </View>

          <TableRow
            label="ID"
            yourValue={formatReportId(match.lost_report_id)}
            matchValue={formatFoundId(match.found_report_id)}
          />
          <TableRow
            label="Category"
            yourValue={match.lost_category_name}
            matchValue={match.found_category_name}
          />
          <TableRow
            label="Item Name"
            yourValue={match.lost_item_name}
            matchValue={match.found_item_name}
          />
          <TableRow
            label="Description"
            yourValue={match.lost_description}
            matchValue={match.found_description}
          />
          <TableRow
            label="Contents"
            yourValue={match.lost_contents}
            matchValue={match.found_contents}
          />
          <TableRow
            label="Date Lost/Found"
            yourValue={formatDate(match.lost_date)}
            matchValue={formatDate(match.found_date)}
          />
          <TableRow
            label="Time Lost/Found"
            yourValue={formatTime(match.lost_date)}
            matchValue={formatTime(match.found_date)}
          />
          <TableRow
            label="Lost/Found At"
            yourValue={formatLocation(match.location_lost)}
            matchValue={formatLocation(match.location_found)}
          />
          <TableRow
            label="Specific Location"
            yourValue={match.lost_specific_location}
            matchValue={match.found_specific_location}
          />
          <TableRow
            label="Currently At"
            yourValue={null}
            matchValue={officeDisplay}
            isLast
          />
        </View>

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        <View style={styles.buttonDivider} />
        <TouchableOpacity
          style={styles.claimButton}
          activeOpacity={0.8}
          onPress={() => setClaimSheetVisible(true)}
        >
          <Text style={styles.claimButtonText}>How to Claim?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.officeButton}
          activeOpacity={0.8}
          onPress={() => {
            router.push({
              pathname: "/(tabs)/map",
              params: { officeId: String(match.office_id) },
            });
          }}
        >
          <Text style={styles.officeButtonText}>View Office Location</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF1E0",
  },
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 48,
  },
  sectionDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.textOnLight,
    textAlign: "center",
  },
  imageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  imageRow: {
    flexDirection: "row",
    gap: 12,
  },
  compareImageWrapper: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  compareLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.textOnLight,
  },
  compareImageBox: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#EDE0D4",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  compareImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  compareImageFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  expandIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 6,
    padding: 4,
  },
  table: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppColors.textOnLight,
    textAlign: "center",
  },
  tableHeaderRight: {
    backgroundColor: "#fcde7d",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableLabelCell: {
    width: 100,
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: "center",
    borderRightWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#FAF6F2",
  },
  tableLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textOnLight,
  },
  tableValueCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "center",
    borderRightWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tableValueCellRight: {
    borderRightWidth: 0,
  },
  tableValueText: {
    fontSize: 12,
    color: AppColors.textOnLight,
    textAlign: "center",
  },
  tableValueMuted: {
    color: AppColors.textMuted,
    fontStyle: "italic",
  },
  buttonDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginTop: 20,
    marginBottom: 20,
  },
  claimButton: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  claimButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  officeButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: AppColors.background,
  },
  officeButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.background,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: "65%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: AppColors.textOnLight,
    textAlign: "center",
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.textOnLight,
    marginBottom: 6,
  },
  stepBody: {
    fontSize: 14,
    color: AppColors.textMuted,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: "justify",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "90%",
    height: "80%",
  },
});