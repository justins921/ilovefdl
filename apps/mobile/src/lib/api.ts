import { ApiClient } from '@ilovefdl/shared';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ilovefdl.com';

const TOKEN_KEY = 'ilovefdl_access_token';

/**
 * Singleton API client instance for the I Love FDL mobile app.
 * Wraps the shared ApiClient with Expo SecureStore for token persistence.
 */
export const api = new ApiClient(API_BASE_URL);

/**
 * Load saved auth token from secure storage and apply it to the API client.
 * Call this once at app startup.
 */
export async function restoreToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      api.setToken(token);
    }
    return token;
  } catch (error) {
    console.error('Failed to restore auth token:', error);
    return null;
  }
}

/**
 * Save a new auth token to secure storage and update the API client.
 */
export async function saveToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    api.setToken(token);
  } catch (error) {
    console.error('Failed to save auth token:', error);
  }
}

/**
 * Clear the auth token from secure storage and the API client.
 */
export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    api.setToken(null);
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}
