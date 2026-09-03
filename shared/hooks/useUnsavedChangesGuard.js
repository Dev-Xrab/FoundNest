import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";

// Module-level singleton: the currently-focused screen's unsaved-changes
// guard, if any, so global navigation chrome (the tab bar, the notification
// bell) can check "does leaving right now need confirmation?" without
// needing direct access to that screen's React state. Mirrors the existing
// reportDraft.js pattern (a plain module-level flag readable from anywhere)
// for the same reason: only one screen can be focused at a time, so a
// singleton is enough. This exists because switching tabs in a bottom-tabs
// navigator does NOT fire `beforeRemove` (tab screens aren't "removed",
// just unfocused — this is documented React Navigation behavior), so the
// per-screen listener below can never see a tab-bar-triggered navigation on
// its own.
let activeGuard = null;

/** Read by shared navigation chrome that isn't itself the focused screen. */
export function getActiveUnsavedChangesGuard() {
  return activeGuard;
}

/**
 * Intercepts leaving the current screen — iOS edge-swipe / any programmatic
 * navigation via `beforeRemove`, Android hardware back via `BackHandler`
 * (which doesn't go through `beforeRemove`), and tab-bar/notification-bell
 * navigation via the registry above (which also doesn't go through
 * `beforeRemove`) — and shows a confirmation modal whenever `hasChanges` is
 * true. When there are no changes, leaving proceeds immediately.
 *
 * When the leave was triggered by something other than this screen's own
 * back/cancel control — `beforeRemove`, or the tab bar/notification bell via
 * the registry — confirming discard continues that exact original
 * navigation (params included) instead of guessing a fallback destination.
 * A screen's own back/cancel button and Android hardware-back have no such
 * captured continuation, so they still fall through to `onDiscard`.
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
  const pendingContinueRef = useRef(null);
  const onDiscardRef = useRef(onDiscard);
  onDiscardRef.current = onDiscard;

  const hasChangesRef = useRef(hasChanges);
  hasChangesRef.current = hasChanges;

  // The one real leave-attempt handler. `continueNavigation` is a callback
  // that completes whatever navigation was blocked to get here (dispatching
  // a captured `beforeRemove` action, or switching tabs) — `null` for an
  // explicit in-screen control, which already has its own well-defined
  // destination via `onDiscard`.
  const attemptLeave = useCallback(
    (continueNavigation) => {
      if (!hasChangesRef.current) {
        bypassRef.current = true;
        if (continueNavigation) {
          continueNavigation();
        } else {
          onDiscardRef.current(true);
        }
        return;
      }
      isLeavingRef.current = true;
      pendingContinueRef.current = continueNavigation ?? null;
      setDiscardVisible(true);
    },
    [],
  );

  const attemptLeaveRef = useRef(attemptLeave);
  useEffect(() => {
    attemptLeaveRef.current = attemptLeave;
  });

  const requestLeave = useCallback(() => {
    attemptLeaveRef.current(null);
  }, []);

  const requestCancel = useCallback(() => {
    if (!hasChangesRef.current) return;
    isLeavingRef.current = false;
    pendingContinueRef.current = null;
    setDiscardVisible(true);
  }, []);

  const confirmDiscard = useCallback(() => {
    setDiscardVisible(false);
    const isLeaving = isLeavingRef.current;
    const pendingContinue = pendingContinueRef.current;
    pendingContinueRef.current = null;

    if (isLeaving) bypassRef.current = true;
    // Always runs first — cleanup (clearing a draft, a toast) plus its own
    // default navigation target, unchanged from before this hook captured
    // pending continuations at all.
    onDiscardRef.current(isLeaving);
    // Then, if the leave was actually triggered by navigating elsewhere in
    // the app, continue to that original target — replacing onDiscard's
    // default target rather than skipping onDiscard entirely, so cleanup
    // still happens even when this fires.
    if (isLeaving && pendingContinue) {
      pendingContinue();
    }
  }, []);

  const dismissDiscard = useCallback(() => {
    pendingContinueRef.current = null;
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
      const guard = {
        hasChanges: () => hasChangesRef.current,
        attemptLeave: (continueNavigation) => attemptLeaveRef.current(continueNavigation),
      };
      activeGuard = guard;
      return () => {
        bypassRef.current = false;
        if (activeGuard === guard) activeGuard = null;
      };
    }, [])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (bypassRef.current) return;
      e.preventDefault();
      const action = e.data.action;
      attemptLeaveRef.current(() => navigation.dispatch(action));
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (bypassRef.current) return false;
        attemptLeaveRef.current(null);
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
