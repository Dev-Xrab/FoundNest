import { addPage, goBack } from "@/constants/previousPage";
import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";

export default function NavigationBackHandler() {
  const pathname = usePathname();
  const router = useRouter();

  // Every time the page changes, add it to the list
  useEffect(() => {
    addPage(pathname);
  }, [pathname]);

  // Phone back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      return goBack(router);
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}
