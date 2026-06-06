import FoundNestLogo from "@/assets/images/app-logo.png";
import AppColors from "@/constants/AppColors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CustomHeader({ title }) {
  const insets = useSafeAreaInsets();

  const router = useRouter();
  function openNotifications() {
    router.push("/allNotification");
  }

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      {}
      <View style={styles.bar}>
        <Image
          source={FoundNestLogo}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>{title}</Text>
        <View style={styles.spacer} />
        <Pressable
          onPress={openNotifications}
          style={styles.bellButton}
          accessibilityRole="button"
          accessibilityLabel="allNotification"
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={AppColors.background}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: AppColors.surface,
  },
  bar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingLeft: 15,
    paddingRight: 15,
    gap: 8,
  },
  title: {
    color: AppColors.background,
    fontSize: 19,
    fontWeight: "700",
    margin: 0,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  spacer: {
    flex: 1,
  },
});
