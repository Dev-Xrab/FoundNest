import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
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

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60; // mirrors OTP_RESEND_COOLDOWN_SECONDS in authServices.js
const LOCKOUT_MESSAGE = "Too many incorrect attempts. Please request a new code.";

export default function ForgotPasswordVerifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { email } = useLocalSearchParams();

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [discardVisible, setDiscardVisible] = useState(false);
  const inputRefs = useRef([]);

  const otp = digits.join("");
  const isComplete = otp.length === OTP_LENGTH;
  const isLockedOut = error === LOCKOUT_MESSAGE;
  const hasChanges = otp.length > 0;
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

  // Tick down the resend cooldown every second
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (text, index) => {
    if (isLockedOut) return;
    const clean = String(text).replace(/[^0-9]/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    const next = [...digits];
    next[index] = clean[clean.length - 1];
    setDigits(next);
    setError("");
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleNext = async () => {
    if (!isComplete || isLockedOut) return;
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(email), otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid verification code.");
        return;
      }

      router.push({
        pathname: "/forgotPasswordSetNew",
        params: { resetToken: data.resetToken },
      });
    } catch (err) {
      setError("Could not connect to server. Check your connection.");
      console.error("Verify OTP error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError("");

    try {
      await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(email) }),
      });

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error("Resend OTP error:", err);
    } finally {
      setIsResending(false);
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
        <Text style={styles.heading}>Enter Verification Code</Text>
        <Text style={styles.subheading}>
          We've sent a verification code to:{"\n"}
          <Text style={styles.emailText}>{String(email)}</Text>
        </Text>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.otpBox, isLockedOut && styles.otpBoxDisabled]}
              value={digit}
              onChangeText={(text) => handleDigitChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              editable={!isLockedOut}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleResend} disabled={isResending || resendCooldown > 0}>
          <Text style={styles.resendText}>
            Didn't receive the code?{" "}
            <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}>
              {resendCooldown > 0
                ? `Resend (${resendCooldown}s)`
                : isResending
                ? "Sending..."
                : "Resend"}
            </Text>
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backTextButton}
            onPress={handleLeavePress}
            activeOpacity={0.8}
          >
            <Text style={styles.backTextButtonText}>Back</Text>
          </TouchableOpacity>

          {isLockedOut ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => {
                bypassRef.current = true;
                router.replace({
                  pathname: "/forgotPassword",
                  params: { prefillEmail: String(email) },
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>Request New Code</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.nextButton,
                (isLoading || !isComplete) && styles.nextButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={isLoading || !isComplete}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={AppColors.background} />
              ) : (
                <Text style={styles.nextButtonText}>Next</Text>
              )}
            </TouchableOpacity>
          )}
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
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
  },
  emailText: { fontWeight: "600", color: AppColors.surface },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    backgroundColor: AppColors.surface,
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.textOnLight,
  },
  otpBoxDisabled: { opacity: 0.4 },
  resendText: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  resendLink: { color: "#F5C542", fontWeight: "600" },
  resendLinkDisabled: { color: "rgba(245,197,66,0.5)" },
  errorText: { color: "#F9E055", fontSize: 13, marginTop: 12 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 28,
  },
  backTextButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: AppColors.surface,
  },
  backTextButtonText: { fontSize: 16, fontWeight: "600", color: AppColors.surface },
  nextButton: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonDisabled: { opacity: 0.6 },
  nextButtonText: { fontSize: 16, fontWeight: "700", color: AppColors.background },
});