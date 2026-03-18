import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// How notifications appear when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Get push token for this device
export async function registerForPushNotifications(): Promise<string | null> {
  // Must be a real device
  if (!Device.isDevice) {
    console.log("Push notifications only work on real devices");
    return null;
  }

  // Ask for permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission not granted for notifications");
    return null;
  }

  // Android needs a channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("freshcart", {
      name: "FreshCart Orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1a7a2e",
    });
  }

  // Get the token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  console.log("Push token:", token.data);
  return token.data;
}