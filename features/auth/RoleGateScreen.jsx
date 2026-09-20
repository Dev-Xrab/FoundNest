import { ADMIN_WEB_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROLE_LABELS = {
  admin: "Admin",
  super_admin: "Super Admin",
};

export default function RoleGateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role } = useLocalSearchParams();

  const roleLabel = ROLE_LABELS[role] || "Admin";

  const handleContinueAsAdmin = () => {
    Linking.openURL(ADMIN_WEB_URL);
  };

  const handleLoginAsEndUser = () => {
    // LoginScreen is still mounted underneath (we got here via router.push),
    // so this just pops back to it — no need to re-navigate.
    router.back();
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <StatusBar style="dark" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <Text style={styles.heading}>You're logged in as {roleLabel}</Text>
        <Text style={styles.subheading}>
          {roleLabel} accounts manage FoundNest from the web portal. Choose how
          you'd like to continue.
        </Text>
      </View>

      <View style={styles.options}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleContinueAsAdmin}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Continue as ${roleLabel}`}
        >
          <View style={styles.iconWrapper}>
            <Ionicons name="shield-checkmark-outline" size={22} color={AppColors.background} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Continue as {roleLabel}</Text>
            <Text style={styles.optionSubtitle}>Opens the web admin portal</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={AppColors.inactiveIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleLoginAsEndUser}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Login as End User"
        >
          <View style={styles.iconWrapper}>
            <Ionicons name="person-outline" size={22} color={AppColors.background} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Login as End User</Text>
            <Text style={styles.optionSubtitle}>
              Sign in with a different account to browse and report items
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={AppColors.inactiveIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.surface,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 20,
  },
  options: {
    gap: 14,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: AppColors.separator,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(139,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.textOnLight,
  },
  optionSubtitle: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 2,
  },
});