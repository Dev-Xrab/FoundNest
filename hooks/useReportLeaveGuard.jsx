import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import { getReportDraft, getReportPage1Dirty } from "@/constants/reportDraft";
import { usePathname } from "expo-router";
import { useCallback, useRef, useState } from "react";

/**
 * Shared "ask before leaving" gate for the lost-report wizard. Any component
 * that can trigger navigation away from the current screen (tab bar,
 * notification bell, hardware back, a push-notification tap) should route
 * that navigation through `guardedNavigate` instead of calling
 * router/navigation methods directly.
 *
 * Checking *before* navigating (instead of reacting to a pathname change
 * after the fact and snapping back) avoids both a visible flash of the
 * destination screen and double-prompting when the confirmed navigation
 * itself changes the pathname.
 */
export function useReportLeaveGuard() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const pendingActionRef = useRef(null);

  const guardedNavigate = useCallback(
    (navigate) => {
      const onReportScreen =
        pathname === "/report" || pathname === "/reportNextPage";
      const hasUnsavedReport =
        onReportScreen && Boolean(getReportDraft() || getReportPage1Dirty());

      if (!hasUnsavedReport) {
        navigate();
        return;
      }

      pendingActionRef.current = navigate;
      setVisible(true);
    },
    [pathname]
  );

  const handleConfirm = useCallback(() => {
    setVisible(false);
    const navigate = pendingActionRef.current;
    pendingActionRef.current = null;
    navigate?.();
  }, []);

  const handleCancel = useCallback(() => {
    setVisible(false);
    pendingActionRef.current = null;
  }, []);

  const LeaveGuardModal = (
    <ConfirmDiscardModal
      visible={visible}
      message="Leave this report? Your progress will be saved as a draft so you can continue later."
      cancelLabel="Keep Editing"
      confirmLabel="Leave"
      onKeepEditing={handleCancel}
      onDiscard={handleConfirm}
    />
  );

  return { guardedNavigate, LeaveGuardModal };
}
