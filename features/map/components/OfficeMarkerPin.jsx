import { StyleSheet, Text, View } from "react-native";

const MARKER_COLOR = "#D32F2F";

export default function OfficeMarkerPin({ label }) {
  return (
    <View style={styles.markerContainer}>
      <View style={styles.pinBubble}>
        <Text style={styles.pinText}>{label}</Text>
      </View>
      <View style={styles.pinTriangle} />
    </View>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  pinBubble: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    backgroundColor: MARKER_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
  pinText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  pinTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: MARKER_COLOR,
    marginTop: -1.5,
  },
});
