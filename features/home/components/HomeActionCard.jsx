import AppColors from "@/constants/AppColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeActionCard({ icon, title, subtitle, onPress }) {
  return (
    <View style={styles.choiceContainer}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={55} color={AppColors.background} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.subTitleText}>{subtitle}</Text>
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
  );
}

const styles = StyleSheet.create({
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
});
