import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
export default async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert("Failed to get push token for push notification!");
      return;
    }

    // Gets the actual token
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: "5b513b9e-ddf8-47a2-b919-16c9c7e8e540",
      })
    ).data;
  } else {
    Alert.alert("Must use physical device for Push Notifications");
  }

  return token;
}
