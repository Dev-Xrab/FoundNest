import AppColors from "@/constants/AppColors";
import { getCachedClaimSteps, getClaimSteps } from "@/constants/claimPolicy";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DISMISS_THRESHOLD = 120;

/**
 * Drag-to-dismiss "How to Claim?" bottom sheet. Steps come from the server
 * (policy "Item Claim Process") and are saved offline, so the last copy is
 * shown immediately and when there's no connection.
 */
export default function HowToClaimSheet({ visible, onClose }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    setLoading(true);
    getCachedClaimSteps()
      .then((cached) => {
        if (!cancelled && cached.length > 0) setSteps(cached);
      })
      .catch(() => {});
    getClaimSteps()
      .then((fresh) => {
        if (!cancelled && fresh.length > 0) setSteps(fresh);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(SCREEN_HEIGHT);
    overlayOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  // Kept in a ref so the PanResponder (created once) always calls the latest closeSheet.
  const closeRef = useRef(closeSheet);
  closeRef.current = closeSheet;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          translateY.setValue(g.dy);
          overlayOpacity.setValue(Math.max(0, 1 - g.dy / SCREEN_HEIGHT));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD || g.vy > 0.8) {
          closeRef.current();
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => closeRef.current()}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeSheet}
          />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View
            {...panResponder.panHandlers}
            collapsable={false}
            style={styles.header}
          >
            <View style={styles.handle} collapsable={false} />
            <Text style={styles.title}>How to Claim?</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {steps.length > 0 ? (
              steps.map((step, index) => (
                <View key={index}>
                  <Text style={styles.stepTitle}>
                    Step {index + 1}: {step.title}
                  </Text>
                  <Text style={styles.stepBody}>{step.description}</Text>
                </View>
              ))
            ) : loading ? (
              <ActivityIndicator
                size="small"
                color={AppColors.background}
                style={styles.status}
              />
            ) : (
              <Text style={[styles.stepBody, styles.empty]}>
                Claim steps are unavailable. Connect to the internet once to
                save them for offline use.
              </Text>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: "65%",
  },
  header: {
    width: "100%",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 18,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: AppColors.textOnLight,
    textAlign: "center",
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.textOnLight,
    marginBottom: 6,
  },
  stepBody: {
    fontSize: 14,
    color: AppColors.textMuted,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: "justify",
  },
  status: { marginVertical: 20 },
  empty: { textAlign: "center", fontStyle: "italic" },
});
