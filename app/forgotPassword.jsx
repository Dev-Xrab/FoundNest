import Toast from "@/components/Toast";
import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const isValidEmailFormat = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { resetExpired, prefillEmail } = useLocalSearchParams();

  const [email, setEmail] = useState(prefillEmail ? String(prefillEmail) : "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [toast, setToast] = useState({
    visible: resetExpired === "1",
    type: "error",
    message: "Your session expired. Please request a new code.",
  });

  const handleNext = async () => {
    if (!email.trim()) return;

    if (!isValidEmailFormat(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      router.push({
        pathname: "/forgotPasswordVerify",
        params: { email: email.trim() },
      });
    } catch (err) {
      setError("Could not connect to server. Check your connection.");
      console.error("Forgot password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
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
            onPress={() => router.back()}
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
          <Text style={styles.heading}>Forgot Password</Text>
          <Text style={styles.subheading}>Please enter your email address.</Text>

          <View style={styles.floatWrapper}>
            <Text style={styles.floatLabel}>Email</Text>
            <TextInput
              style={styles.floatInput}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={handleNext}
              editable={!isLoading}
              placeholderTextColor="rgba(0,0,0,0.25)"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.nextButton,
              (isLoading || !email.trim()) && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={isLoading || !email.trim()}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={AppColors.background} />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <Toast
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
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
  heading: {
    fontSize: 26,
    fontWeight: "700",
    color: AppColors.surface,
    textAlign: "center",
  },
  subheading: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
  },
  floatWrapper: {
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  floatLabel: { fontSize: 12, fontWeight: "600", color: AppColors.background },
  floatInput: { fontSize: 15, color: AppColors.textOnLight, paddingVertical: 2 },
  errorText: { color: "#F9E055", fontSize: 13, marginTop: 10, marginLeft: 4 },
  nextButton: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    alignSelf: "flex-end",
    paddingHorizontal: 32,
  },
  nextButtonDisabled: { opacity: 0.6 },
  nextButtonText: { fontSize: 16, fontWeight: "700", color: AppColors.background },
});