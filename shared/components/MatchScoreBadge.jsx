import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

// Strength tiers for a match score percentage (0–100).
export function getMatchStrength(percentage) {
  if (percentage >= 90) return { label: "Very High", color: "#2E7D32" };
  if (percentage >= 80) return { label: "High", color: "#558B2F" };
  if (percentage >= 70) return { label: "Moderate", color: "#E08A00" };
  return { label: "Low", color: "#C0392B" };
}

export function formatMatchPercent(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return `${Math.round(n)}%`;
}

// The API can report IMAGE_MATCH even when the lost report has no photo, so
// only treat it as an image match if there is a lost-report image to compare.
export function effectiveMatchType(match) {
  const hasLostImage = !!(match?.lost_item_image || match?.lost_image_url);
  return match?.match_type === "IMAGE_MATCH" && !hasLostImage
    ? "TEXT_MATCH"
    : match?.match_type;
}

export function matchTypeLabel(matchType) {
  if (matchType === "IMAGE_MATCH") return "Image match";
  if (matchType === "TEXT_MATCH") return "Text match";
  return null;
}

/**
 * Pill showing how strongly a found item matches a lost report,
 * e.g. an image or document icon with "90%". Renders nothing when there is no score.
 * Pass `style` to position it (e.g. absolute over an image).
 */
export default function MatchScoreBadge({ score, matchType, style }) {
  const percent = formatMatchPercent(score);
  if (percent === null) return null;
  const { color } = getMatchStrength(Number(score));
  const icon =
    matchType === "TEXT_MATCH" ? "document-text" : "image";

  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Ionicons name={icon} size={12} color="#FFFFFF" />
      <Text style={styles.text}>{percent}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
