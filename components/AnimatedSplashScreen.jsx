import AppColors from "@/constants/AppColors";
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text } from "react-native";

export default function AnimatedSplashScreen({ onAnimationFinish }) {
  // 1. We only need ONE value to control everything. It starts at 0 (invisible).
  const mainOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 2. A simple, easy-to-read 3-step sequence
    Animated.sequence([
      // Step A: Fade the whole screen in
      Animated.timing(mainOpacity, {
        toValue: 1,
        duration: 800, // Takes slightly less than a second
        useNativeDriver: true,
      }),

      // Step B: Hold it on screen so the user can read it
      Animated.delay(1200), // Waits for 1.2 seconds

      // Step C: Fade the whole screen out
      Animated.timing(mainOpacity, {
        toValue: 0,
        duration: 500, // Fades out in half a second
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 3. Tell the root layout to move on to the actual app
      onAnimationFinish();
    });
  }, []);

  return (
    // 4. We apply our single animation to this main outer container
    <Animated.View style={[styles.splashContainer, { opacity: mainOpacity }]}>
      <Image
        source={require("../assets/images/splash-icon.png")}
        style={styles.image}
        resizeMode="contain"
      />

      <Text style={styles.logoName}>FoundNest</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColors.surface,
  },
  image: {
    width: 170,
    height: 170,
  },
  logoName: {
    marginTop: 0,
    fontSize: 32,
    fontWeight: "600",
    color: AppColors.background,
    letterSpacing: 2.5,
  },
});
