import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react"; // Added useState
import "react-native-reanimated";

import AnimatedSplashScreen from "@/components/AnimatedSplashScreen"; // 1. Import your custom splash screen
import GlobalToast from "@/components/GlobalToast";
import NavigationBackHandler from "@/components/NavigationBackHandler";
import AppColors from "@/constants/AppColors";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "login",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: AppColors.activeIcon,
    background: AppColors.surface,
    card: AppColors.surface,
    text: AppColors.textOnLight,
    border: AppColors.separator,
    notification: AppColors.activeIcon,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // 2. Add a state to track when your custom animation is done
  const [animationFinished, setAnimationFinished] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // 3. Only hide the NATIVE splash screen when the fonts are finally loaded
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // 4. Hold on the native splash screen while fonts are loading
  if (!loaded) {
    return null;
  }

  // 5. Fonts are loaded! Now show your custom animation until it finishes
  if (!animationFinished) {
    return (
      <AnimatedSplashScreen
        onAnimationFinish={() => setAnimationFinished(true)}
      />
    );
  }

  // 6. Animation is completely done. Hand the screen over to your app routes.
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={NavigationTheme}>
      <NavigationBackHandler />
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgotPassword" options={{ headerShown: false }} />
        <Stack.Screen name="forgotPasswordVerify" options={{ headerShown: false }} />
        <Stack.Screen name="forgotPasswordSetNew" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="allNotification"
          options={{ headerShown: false }}
        />
      </Stack>
      <GlobalToast />
    </ThemeProvider>
  );
}
