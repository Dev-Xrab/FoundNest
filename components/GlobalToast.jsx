import Toast from "@/components/Toast";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

let listener = null;
// A toast fired before <GlobalToast /> has mounted (e.g. during the splash
// animation) is held here and shown as soon as the host registers.
let pending = null;

export default function GlobalToast() {
  const [toast, setToast] = useState({
    visible: false,
    type: "success",
    message: "",
    inverted: false,
  });
  const [toastKey, setToastKey] = useState(0);

  const trigger = useCallback((message, type, inverted) => {
    setToast({ visible: true, type, message, inverted });
    setToastKey((key) => key + 1);
  }, []);

  useEffect(() => {
    listener = trigger;
    if (pending) {
      trigger(pending.message, pending.type, pending.inverted);
      pending = null;
    }
    return () => {
      if (listener === trigger) listener = null;
    };
  }, [trigger]);

  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  // Full-window, touch-transparent layer so the toast is positioned against
  // the whole screen (not whatever parent it happens to sit in) and never
  // swallows taps meant for the screen underneath.
  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Toast
        key={toastKey}
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        inverted={toast.inverted}
        onHide={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
});

/**
 * Pings the global toast — shows `message` for ~2s before auto-hiding.
 * Callable from any page, tab or not.
 * Pass `inverted: true` for a white-background/red-text toast, used on
 * screens (like login) where the default red toast would blend into a red
 * background.
 */
export function showToast(message, type = "success", { inverted = false } = {}) {
  if (listener) {
    listener(message, type, inverted);
  } else {
    pending = { message, type, inverted };
  }
}
