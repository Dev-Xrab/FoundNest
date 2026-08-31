import Toast from "@/components/Toast";
import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

/**
 * Mounted once at the root of the navigation tree (app/_layout.jsx) so the
 * toast overlays whichever screen is active. `key` forces the Toast to
 * remount on every showToast() call, restarting its 5s auto-hide timer even
 * if a toast is already on screen.
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    visible: false,
    type: "success",
    message: "",
  });
  const [toastKey, setToastKey] = useState(0);

  const showToast = useCallback((message, type = "success") => {
    setToast({ visible: true, type, message });
    setToastKey((key) => key + 1);
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        key={toastKey}
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
