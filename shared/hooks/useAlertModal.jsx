import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import { useCallback, useState } from "react";

/**
 * One reusable in-app alert modal per screen, replacing native
 * `Alert.alert()` calls so every message/confirmation uses the app's own
 * styled modal instead of the OS dialog. Call `showAlert({ message, ... })`
 * from anywhere in the screen, then render `alertModal` once in the JSX.
 *
 * Defaults to a single "OK" dismiss button, matching a plain `Alert.alert(message)`.
 * Pass both `cancelLabel` and `confirmLabel` for a two-button confirmation.
 */
export function useAlertModal() {
  const [config, setConfig] = useState({
    visible: false,
    message: "",
    cancelLabel: "OK",
    confirmLabel: null,
    onConfirm: () => {},
  });

  const showAlert = useCallback(
    ({ message, cancelLabel = "OK", confirmLabel = null, onConfirm = () => {} }) => {
      setConfig({
        visible: true,
        message,
        cancelLabel,
        confirmLabel,
        onConfirm: () => {
          onConfirm();
          setConfig((prev) => ({ ...prev, visible: false }));
        },
      });
    },
    [],
  );

  const dismissAlert = useCallback(() => {
    setConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const alertModal = (
    <ConfirmDiscardModal
      visible={config.visible}
      message={config.message}
      cancelLabel={config.cancelLabel}
      confirmLabel={config.confirmLabel}
      onKeepEditing={dismissAlert}
      onDiscard={config.onConfirm}
    />
  );

  return { alertModal, showAlert };
}
