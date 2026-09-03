import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";

/**
 * Intercepts leaving the current screen — iOS edge-swipe / any programmatic
 * navigation via `beforeRemove`, and Android hardware back via `BackHandler`
 * (which doesn't go through `beforeRemove`) — and shows a confirmation
 * modal whenever `hasChanges` is true. When there are no changes, leaving
 * proceeds immediately.
 *
 * Some screens also have an in-page "Cancel" button that resets the form
 * without navigating anywhere; `requestCancel` drives that path, and
 * `onDiscard(isLeaving)` is told which one was confirmed so the screen can
 * decide whether to navigate away on top of resetting its fields.
 *
 * Used by every screen that protects unsaved input against accidental loss:
 * the forgot-password flow, profile edit screens, the report-history edit
 * wizard, and the QR item register/edit/view/success screens.
 */
export function useUnsavedChangesGuard(hasChanges, onDiscard) {
  const navigation = useNavigation();
  const [discardVisible, setDiscardVisible] = useState(false);

  const bypassRef = useRef(false);
  const isLeavingRef = useRef(true);
  const onDiscardRef = useRef(onDiscard);
  onDiscardRef.current = onDiscard;

  const requestLeave = useCallback(() => {
    if (!hasChanges) {
      bypassRef.current = true;
      onDiscardRef.current(true);
      return;
    }
    isLeavingRef.current = true;
    setDiscardVisible(true);
  }, [hasChanges]);

  const requestLeaveRef = useRef(requestLeave);
  useEffect(() => {
    requestLeaveRef.current = requestLeave;
  });

  const requestCancel = useCallback(() => {
    if (!hasChanges) return;
    isLeavingRef.current = false;
    setDiscardVisible(true);
  }, [hasChanges]);

  const confirmDiscard = useCallback(() => {
    setDiscardVisible(false);
    const isLeaving = isLeavingRef.current;
    if (isLeaving) bypassRef.current = true;
    onDiscardRef.current(isLeaving);
  }, []);

  const dismissDiscard = useCallback(() => {
    setDiscardVisible(false);
  }, []);

  // Escape hatch for a screen's own successful-action navigation (e.g. after
  // a save/submit that redirects elsewhere) — lets that `router.replace`/
  // `router.navigate` through without tripping the discard-confirmation
  // modal, the same way confirming Discard does.
  const bypassNextLeave = useCallback(() => {
    bypassRef.current = true;
  }, []);

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
      requestLeaveRef.current();
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (bypassRef.current) return false;
        requestLeaveRef.current();
        return true;
      });
      return () => subscription.remove();
    }, [])
  );

  return {
    discardVisible,
    requestLeave,
    requestCancel,
    confirmDiscard,
    dismissDiscard,
    bypassNextLeave,
  };
}
