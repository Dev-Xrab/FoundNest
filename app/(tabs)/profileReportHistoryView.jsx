import AppColors from "@/constants/AppColors";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
        style={styles.modalOverlay2}
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

// ── How to Claim Modal (matched to ItemDetails.jsx style) ─────────────────────
function HowToClaimSheet({ visible, onClose, claimSteps }) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Pressing the dark background will close the modal */}
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPressOut={onClose}
      >
        {/* Prevent touches inside the white card from closing the modal */}
        <TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />

            <Text style={styles.modalTitle}>How to Claim?</Text>

            {claimSteps.length > 0 ? (
              claimSteps.map((step, index) => (
                <View key={index}>
                  <Text style={styles.stepTitle}>
                    Step {index + 1}: {step.title}
                  </Text>
                  <Text style={styles.stepDescription}>
                    {step.description}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.stepDescription}>
                Loading claim process...
              </Text>
            )}
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileReportHistoryView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { match: matchParam } = useLocalSearchParams();
  const match = matchParam ? JSON.parse(matchParam) : {};
  const [claimSteps, setClaimSteps] = useState([]);

  useEffect(() => {
    const fetchClaimPolicy = async () => {
      try {
        const response = await fetch(
          "https://foundnest-backend.onrender.com/api/policies"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch policies");
        }

        const data = await response.json();

        const claimPolicy = data.find(
          (policy) => policy.policy_name === "Item Claim Process"
        );

        if (claimPolicy) {
          const steps = JSON.parse(claimPolicy.policy_value);
          setClaimSteps(steps);
        }
      } catch (error) {
        console.error("Error fetching claim policy:", error);
      }
    };

    fetchClaimPolicy();
  }, []);

  const [claimSheetVisible, setClaimSheetVisible] = useState(false);

  // Derived display values
  const officeDisplay = orNA(match.office_name)
    ? `${match.office_name}${orNA(match.office_location) ? `\n${match.office_location}` : ""}`
    : null;

  return (
    <View style={styles.screen}>
      <HowToClaimSheet
        visible={claimSheetVisible}
        onClose={() => setClaimSheetVisible(false)}
        claimSteps={claimSteps}
      />

      {/* ── Red header ─────────────────────────────────────────────────── */}
      <View style={[styles.redHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.navigate("/(tabs)/profileReportHistory")}
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
            <CompareImage uri={match.lost_item_image} label="Your Image" />
            <CompareImage
              uri={match.found_item_image}
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

  // ── Content
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 48,
  },

  // ── Section divider row (lines + title)
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

  // ── Image comparison white card
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

  // ── Table
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

  // ── Button divider
  buttonDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginTop: 20,
    marginBottom: 20,
  },

  // ── Action buttons
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

  // ── How to Claim modal (matched to ItemDetails.jsx) ──────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 80,
    width: "100%",
  },
  dragHandle: {
    width: 50,
    height: 5,
    backgroundColor: "#EBEBEB",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
    textAlign: "center",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginTop: 15,
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  // ── Full image modal (unchanged from original)
  modalOverlay2: {
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