import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function Toast({ visible, type = "success", message, inverted = false, onHide }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1300),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide?.();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const isSuccess = type === "success";
  const accentColor = inverted ? "#990000" : "#FFFFFF";

  return (
    <Animated.View style={[styles.toast, inverted && styles.toastInverted, { opacity }]}>
      <View style={styles.iconWrapper}>
        <Ionicons
          name={isSuccess ? "checkmark-circle" : "information-circle"}
          size={20}
          color={accentColor}
        />
      </View>
      <Text style={[styles.message, { color: accentColor }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 150,
    alignSelf: "center",
    backgroundColor: "#990000",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 999,
    zIndex: 999,
    maxWidth: "85%",
  },
  toastInverted: {
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
});
