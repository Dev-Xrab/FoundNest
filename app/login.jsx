import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import { clearSavedEmail, getSavedEmail, saveEmail, saveSession } from "@/constants/StudentData";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar"; 
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

function FloatingLabelInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  editable,
  rightElement,
}) {
  return (
    <View style={styles.floatWrapper}>
      <Text style={styles.floatLabel}>{label}</Text>
      <View style={styles.floatInputRow}>
        <TextInput
          style={[styles.floatInput, rightElement && { paddingRight: 44 }]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          placeholderTextColor="rgba(0,0,0,0.25)"
        />
        {rightElement && <View style={styles.floatRight}>{rightElement}</View>}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const loadSavedEmail = async () => {
      const saved = await getSavedEmail();
      if (saved) setEmail(saved);
    };
    loadSavedEmail();
  }, []);

  const isFormIncomplete = !email.trim() || !password.trim();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(
          data.message || "Invalid email or password. Please try again.",
        );
        return;
      }

      if (data.user?.user_role !== 'user') {
        setLoginError('This account is not authorized for mobile access.');
        return;
      }

      if (rememberMe) {
        await saveEmail(data.user.email);  
      } else {
        await clearSavedEmail();
      }

      await saveSession(data.accessToken, data.user, rememberMe, data.refreshToken);
      router.replace('/(tabs)');

    } catch (error) {
      setLoginError("Could not connect to server. Check your connection.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
      enableOnAndroid={true}
      extraScrollHeight={20}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* TOP — white section with illustration */}
      <View style={styles.topSection}>
        <Image
          source={require("@/assets/images/login-image.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      {/* BOTTOM — deep red card */}
      <View
        style={[
          styles.card,
          { paddingBottom: Math.max(insets.bottom + 8, 16) },
        ]}
      >
        <Text style={styles.heading}>Log In</Text>

        {/* Email */}
        <View style={styles.inputWrapper}>
          <FloatingLabelInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setLoginError("");
            }}
            keyboardType="email-address"
            returnKeyType="next"
            editable={!isLoading}
          />
        </View>

        {/* Password */}
        <View style={styles.inputWrapper}>
          <FloatingLabelInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setLoginError("");
            }}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!isLoading}
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="rgba(0,0,0,0.35)"
                />
              </TouchableOpacity>
            }
          />
        </View>

        {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

        {/* Remember me + Forgot password */}
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setRememberMe((v) => !v)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe }}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
            >
              {rememberMe && (
                <Ionicons
                  name="checkmark"
                  size={12}
                  color={AppColors.background}
                />
              )}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.5} accessibilityRole="button">
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            (isLoading || isFormIncomplete) && styles.loginButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={isLoading || isFormIncomplete}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={AppColors.background} />
          ) : (
            <Text style={styles.loginButtonText}>Log In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.surface,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  topSection: {
    backgroundColor: AppColors.surface,
    paddingTop: 60,
    alignItems: "center",
  },
  illustration: {
    width: "70%",
    height: 300,
    marginTop: 10,
  },
  card: {
    flex: 1,
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 10,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: AppColors.surface,
    textAlign: "center",
    marginBottom: 30,
  },
  inputWrapper: {
    marginBottom: 14,
  },
  floatWrapper: {
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  floatLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.background,
    marginBottom: 2,
  },
  floatInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  floatInput: {
    flex: 1,
    fontSize: 15,
    color: AppColors.textOnLight,
    paddingVertical: 2,
  },
  floatRight: {
    position: "absolute",
    right: 0,
    padding: 2,
  },
  errorText: {
    color: "#F9E055",
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 4,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 28,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: AppColors.surface,
    borderColor: AppColors.surface,
  },
  rememberText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.80)",
  },
  forgotText: {
    fontSize: 13,
    color: "#F5C542",
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: AppColors.background,
  },
});
