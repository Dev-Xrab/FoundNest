import { StyleSheet, Text } from "react-native";

/** Red " *" placed inside a field label's <Text> to mark the field required. */
export default function RequiredMark() {
  return <Text style={styles.mark}> *</Text>;
}

const styles = StyleSheet.create({
  mark: {
    color: "#C62828",
  },
});
