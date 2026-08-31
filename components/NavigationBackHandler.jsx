import { addPage, goBack } from "@/constants/previousPage";
import { useReportLeaveGuard } from "@/hooks/useReportLeaveGuard";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";

export default function NavigationBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const { guardedNavigate, LeaveGuardModal } = useReportLeaveGuard();

  // The back-press effect below subscribes once per router identity, so it
  // reads guardedNavigate through a ref to always call the current version
  // instead of a stale one from an earlier pathname.
  const guardedNavigateRef = useRef(guardedNavigate);
  useEffect(() => {
    guardedNavigateRef.current = guardedNavigate;
  }, [guardedNavigate]);

  // Every time the page changes, add it to the list
  useEffect(() => {
    addPage(pathname);
  }, [pathname]);

  // Phone back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      guardedNavigateRef.current(() => goBack(router));
      return true; // always handled — goBack() itself already blocks the default exit on Home
    });

    return () => subscription.remove();
  }, [router]);

  return LeaveGuardModal;
}
