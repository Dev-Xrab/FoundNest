import AppColors from "@/constants/AppColors";
import { StyleSheet, Text, View } from "react-native";

/** Shared field primitives for the Register and Edit forms — label, read-only value box, and error text. */

export function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

// Label for editable fields (no asterisk)
export function RequiredLabel({ label }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

export function ReadOnlyField({ label, value }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{value || "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.textOnLight,
    marginBottom: 6,
  },
  readOnlyBox: {
    backgroundColor: "#EDE0D4",
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: "center",
  },
  readOnlyText: {
    fontSize: 16,
    color: AppColors.textOnLight,
  },
  fieldError: {
    color: "#C62828",
    fontSize: 13,
    marginTop: 4,
  },
});
