import { addPage, goBack } from "@/constants/previousPage";
import { useReportLeaveGuard } from "@/hooks/useReportLeaveGuard";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";

export default function NavigationBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useGlobalSearchParams();
  const { guardedNavigate, LeaveGuardModal } = useReportLeaveGuard();

  // The back-press effect below subscribes once per router identity, so it
  // reads guardedNavigate through a ref to always call the current version
  // instead of a stale one from an earlier pathname.
  const guardedNavigateRef = useRef(guardedNavigate);
  useEffect(() => {
    guardedNavigateRef.current = guardedNavigate;
  }, [guardedNavigate]);

  // Every time the page (or its params, e.g. a fresh editSession/report on
  // the same path) changes, add it to the list — with its params, so a
  // later goBack() can restore a params-dependent screen correctly instead
  // of replaying it blank.
  const paramsKey = JSON.stringify(params);
  useEffect(() => {
    addPage(pathname, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, paramsKey]);

  // Phone back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        guardedNavigateRef.current(() => goBack(router));
        return true; // always handled — goBack() itself already blocks the default exit on Home
      },
    );

    return () => subscription.remove();
  }, [router]);

  return LeaveGuardModal;
}
