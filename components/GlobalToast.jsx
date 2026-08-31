import Toast from "@/components/Toast";
import { useCallback, useState } from "react";

let listener = null;

/**
 * Mounted once at the root of the navigation tree (app/_layout.jsx) so the
 * toast overlays whichever screen is active — including screens outside the
 * tabs navigator (login, forgot password). Any file can trigger it by
 * importing `showToast` directly; no context/hook plumbing required.
 *
 * `listener` is assigned during render rather than inside an effect: effects
 * only start firing after the whole tree has committed, so assigning it here
 * guarantees it's ready before another screen's own mount-time effect gets a
 * chance to call showToast(), even on the very first app render.
 */
export default function GlobalToast() {
  const [toast, setToast] = useState({
    visible: false,
    type: "success",
    message: "",
  });
  const [toastKey, setToastKey] = useState(0);

  const trigger = useCallback((message, type) => {
    setToast({ visible: true, type, message });
    setToastKey((key) => key + 1);
  }, []);

  listener = trigger;

  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  return (
    <Toast
      key={toastKey}
      visible={toast.visible}
      type={toast.type}
      message={toast.message}
      onHide={hideToast}
    />
  );
}

/**
 * Pings the global toast — shows `message` for ~5s before auto-hiding.
 * Callable from any page, tab or not.
 */
export function showToast(message, type = "success") {
  listener?.(message, type);
}
