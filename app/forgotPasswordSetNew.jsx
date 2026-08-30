import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import PasswordChecklist from "@/components/PasswordChecklist";
import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EXPIRED_SESSION_MESSAGE = "Reset session expired or invalid. Please start over.";

export default function ForgotPasswordSetNewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { resetToken } = useLocalSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [serverError, setServerError] = useState("");
  const [discardVisible, setDiscardVisible] = useState(false);

  const isValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[^a-zA-Z0-9]/.test(newPassword);

  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isValid && passwordsMatch;
  const hasChanges = newPassword.length > 0 || confirmPassword.length > 0;
  const handleCancelPressRef = useRef(() => {});
  const bypassRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      bypassRef.current = false;
      return () => {
        bypassRef.current = false;
      };
    }, [])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (bypassRef.current) return;
      e.preventDefault();
      handleCancelPressRef.current();
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (bypassRef.current) return false;
        handleCancelPressRef.current();
        return true;
      });

      return () => subscription.remove();
    }, [])
  );

  const handleLeavePress = () => {
    if (!hasChanges) {
      bypassRef.current = true;
      router.back();
      return;
    }
    setDiscardVisible(true);
  };

  useEffect(() => {
    handleCancelPressRef.current = handleLeavePress;
  });

  const handleDiscard = () => {
    setDiscardVisible(false);
    bypassRef.current = true;
    router.back();
  };

  const handleDone = async () => {
    if (!isValid) return;
    if (!passwordsMatch) {
      setConfirmError("Passwords do not match.");
      return;
    }

    setConfirmError("");
    setServerError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken: String(resetToken), newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message === EXPIRED_SESSION_MESSAGE) {
          bypassRef.current = true;
          router.replace({
            pathname: "/forgotPassword",
            params: { resetExpired: "1" },
          });
          return;
        }
        setServerError(data.message || "Could not reset password. Please start over.");
        return;
      }

      bypassRef.current = true;
      router.replace({
        pathname: "/login",
        params: { passwordResetSuccess: "1" },
      });
    } catch (err) {
      setServerError("Could not connect to server. Check your connection.");
      console.error("Reset password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ConfirmDiscardModal
        visible={discardVisible}
        onKeepEditing={() => setDiscardVisible(false)}
        onDiscard={handleDiscard}
      />

      <KeyboardAwareScrollView
        style={styles.root}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
      <StatusBar style="dark" backgroundColor="transparent" translucent />

      <View style={[styles.topSection, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={handleLeavePress}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={AppColors.textOnLight} />
        </TouchableOpacity>
        <Image
          source={require("@/assets/images/forgot-password.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      <View
        style={[styles.card, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}
      >
        <Text style={styles.heading}>Set New Password</Text>
        <Text style={styles.subheading}>
          Password must contain an uppercase letter, a special character, and a
          number.
        </Text>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldBox}>
            <TextInput
              style={styles.fieldInput}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setServerError("");
              }}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="New Password"
              placeholderTextColor="rgba(0,0,0,0.35)"
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowNew((v) => !v)} activeOpacity={0.7}>
              <Ionicons
                name={showNew ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="rgba(0,0,0,0.35)"
              />
            </TouchableOpacity>
          </View>
          {newPassword.length > 0 && <PasswordChecklist password={newPassword} variant="dark" />}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldBox}>
            <TextInput
              style={styles.fieldInput}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmError("");
                setServerError("");
              }}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Confirm New Password"
              placeholderTextColor="rgba(0,0,0,0.35)"
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm((v) => !v)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showConfirm ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="rgba(0,0,0,0.35)"
              />
            </TouchableOpacity>
          </View>
          {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
        </View>

        {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backTextButton}
            onPress={handleLeavePress}
            activeOpacity={0.8}
          >
            <Text style={styles.backTextButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.doneButton,
              (isLoading || !canSubmit) && styles.doneButtonDisabled,
            ]}
            onPress={handleDone}
            disabled={isLoading || !canSubmit}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={AppColors.background} />
            ) : (
              <Text style={styles.doneButtonText}>Done</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppColors.surface },
  scroll: { flexGrow: 1, justifyContent: "space-between" },
  topSection: { backgroundColor: AppColors.surface, alignItems: "center" },
  backButton: {
    position: "absolute",
    left: 16,
    top: 12,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: { width: "70%", height: 260, marginTop: 40 },
  card: {
    flex: 1,
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 34,
  },
  heading: { fontSize: 24, fontWeight: "700", color: AppColors.surface, textAlign: "center" },
  subheading: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 26,
  },
  fieldGroup: { marginBottom: 14 },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
  },
  fieldInput: { flex: 1, fontSize: 15, color: AppColors.textOnLight },
  errorText: { color: "#F9E055", fontSize: 13, marginTop: 4, marginLeft: 4 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  backTextButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: AppColors.surface,
  },
  backTextButtonText: { fontSize: 16, fontWeight: "600", color: AppColors.surface },
  doneButton: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonDisabled: { opacity: 0.6 },
  doneButtonText: { fontSize: 16, fontWeight: "700", color: AppColors.background },
});