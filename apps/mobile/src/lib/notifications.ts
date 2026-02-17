import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-notifications';
import { api } from './api';

/**
 * Configure how notifications are displayed when the app is in the foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token.
 * Returns the token string or null if permissions were denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses the project ID from app.json automatically
    });
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Register the push token with the backend API.
 */
export async function sendTokenToServer(token: string): Promise<void> {
  try {
    await api.registerPushToken({
      token,
      platform: Platform.OS,
    });
  } catch (error) {
    console.error('Failed to register push token with server:', error);
  }
}

/**
 * Set up notification listeners for handling incoming and tapped notifications.
 * Returns a cleanup function to remove the listeners.
 */
export function setupNotificationListeners(): () => void {
  // Listener for notifications received while app is in foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const { title, body } = notification.request.content;
      console.log('Notification received:', title, body);
    },
  );

  // Listener for when user taps a notification
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationNavigation(data);
    });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Handle deep linking from notification data.
 * Expects data to contain a `type` field and relevant IDs/slugs.
 */
function handleNotificationNavigation(data: Record<string, unknown>): void {
  const type = data.type as string | undefined;
  const slug = data.slug as string | undefined;

  if (!type || !slug) return;

  // Navigation will be handled by the app's linking config / expo-router
  // The notification data should match the app's URL scheme
  switch (type) {
    case 'product':
      // expo-router will handle: /product/[slug]
      console.log('Navigate to product:', slug);
      break;
    case 'post':
      // expo-router will handle: /post/[slug]
      console.log('Navigate to post:', slug);
      break;
    case 'bar':
      // expo-router will handle: /bar/[slug]
      console.log('Navigate to bar:', slug);
      break;
    case 'special':
      // Navigate to specials tab
      console.log('Navigate to specials');
      break;
    case 'order':
      // Navigate to profile/orders
      console.log('Navigate to order:', slug);
      break;
    default:
      console.log('Unknown notification type:', type);
  }
}

/**
 * Configure notification categories for actionable notifications.
 */
export async function configureNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('new_special', [
    {
      identifier: 'VIEW_SPECIAL',
      buttonTitle: 'View Special',
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('new_post', [
    {
      identifier: 'READ_MORE',
      buttonTitle: 'Read More',
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('order_update', [
    {
      identifier: 'VIEW_ORDER',
      buttonTitle: 'View Order',
      options: { opensAppToForeground: true },
    },
  ]);
}

/**
 * One-time setup to run on app startup.
 * Configures notification handling and categories.
 */
export async function setupNotifications(): Promise<void> {
  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1f8c9b',
    });
  }

  await configureNotificationCategories();
  setupNotificationListeners();
}
