import AppColors from "@/constants/AppColors";
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text } from "react-native";

export default function AnimatedSplashScreen({ onAnimationFinish }) {
  const mainOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(mainOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(mainOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationFinish();
    });
  }, []);

  return (
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
    backgroundColor: "#FFFFFF", // explicit white, not tied to AppColors
  },
  image: {
    width: 220,
    height: 220,
  },
  logoName: {
    marginTop: 12,
    fontSize: 32,
    fontWeight: "600",
    color: "#6E1414", // maroon pulled from the nest artwork
    letterSpacing: 2.5,
  },
});