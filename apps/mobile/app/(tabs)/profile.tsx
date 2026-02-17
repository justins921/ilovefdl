import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import type { NotificationPreference, Order } from '@ilovefdl/shared';
import { api } from '@/lib/api';
import { useEffect } from 'react';

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

export default function ProfileScreen() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference | null>(null);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const [ordersRes, prefsRes] = await Promise.all([
        api.getOrders({ limit: 10 }),
        api.getNotificationPreferences(),
      ]);
      setOrders(ordersRes.data);
      setNotifPrefs(prefsRes.data);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }
    setLoginLoading(true);
    try {
      await login(email.trim());
      Alert.alert(
        'Check Your Email',
        'We sent you a magic link. Tap it to sign in.',
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send magic link. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const toggleNotifPref = async (
    key: 'breakingNews' | 'dailySpecials' | 'orderUpdates',
  ) => {
    if (!notifPrefs) return;
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    try {
      await api.updateNotificationPreferences({
        breakingNews: updated.breakingNews,
        dailySpecials: updated.dailySpecials,
        orderUpdates: updated.orderUpdates,
      });
    } catch (error) {
      // Revert on failure
      setNotifPrefs(notifPrefs);
      console.error('Failed to update notification prefs:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.teal} />
      </View>
    );
  }

  // Not authenticated -- show login prompt
  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <View style={styles.loginIconWrapper}>
            <Ionicons name="heart" size={48} color={COLORS.accent} />
          </View>
          <Text style={styles.loginTitle}>Welcome to I Love FDL</Text>
          <Text style={styles.loginSubtitle}>
            Sign in to track orders, save favorites, and get personalized
            notifications.
          </Text>
          <TextInput
            style={styles.emailInput}
            placeholder="your@email.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loginLoading}
          >
            {loginLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>Send Magic Link</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Authenticated -- show profile
  return (
    <ScrollView style={styles.container}>
      {/* User Info */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.name || user.email).charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user.name || 'FDL Supporter'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userRole}>{user.role}</Text>
        </View>
      </View>

      {/* Order History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order History</Text>
        {orders.length > 0 ? (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderDate}>
                  {formatDate(order.createdAt)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    order.status === 'PAID' && styles.statusPaid,
                    order.status === 'FULFILLED' && styles.statusFulfilled,
                  ]}
                >
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>
              <Text style={styles.orderTotal}>
                {formatPrice(order.total)}
              </Text>
              <Text style={styles.orderItems}>
                {order.items?.length ?? 0} item
                {(order.items?.length ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        )}
      </View>

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Ionicons name="flash" size={18} color={COLORS.accent} />
              <Text style={styles.settingText}>Breaking News</Text>
            </View>
            <Switch
              value={notifPrefs?.breakingNews ?? false}
              onValueChange={() => toggleNotifPref('breakingNews')}
              trackColor={{ true: COLORS.teal, false: '#ddd' }}
              thumbColor={COLORS.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Ionicons name="pricetag" size={18} color={COLORS.teal} />
              <Text style={styles.settingText}>Daily Specials</Text>
            </View>
            <Switch
              value={notifPrefs?.dailySpecials ?? false}
              onValueChange={() => toggleNotifPref('dailySpecials')}
              trackColor={{ true: COLORS.teal, false: '#ddd' }}
              thumbColor={COLORS.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Ionicons name="bag-check" size={18} color={COLORS.primaryDark} />
              <Text style={styles.settingText}>Order Updates</Text>
            </View>
            <Switch
              value={notifPrefs?.orderUpdates ?? false}
              onValueChange={() => toggleNotifPref('orderUpdates')}
              trackColor={{ true: COLORS.teal, false: '#ddd' }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Ionicons name="person-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.settingText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Ionicons name="shield-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.settingText}>Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Ionicons name="help-circle-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.accent} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },

  // --- Login ---
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 24,
  },
  loginCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  loginIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  emailInput: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.primaryDark,
    marginBottom: 16,
  },
  loginButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // --- Profile Header ---
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  userEmail: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // --- Sections ---
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 12,
  },

  // --- Orders ---
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 13,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  statusPaid: {
    backgroundColor: '#e6f9f0',
  },
  statusFulfilled: {
    backgroundColor: '#e0f0ff',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  orderItems: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  emptyCard: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },

  // --- Settings ---
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: {
    fontSize: 15,
    color: COLORS.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginLeft: 44,
  },

  // --- Logout ---
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },
  bottomSpacer: {
    height: 32,
  },
});
