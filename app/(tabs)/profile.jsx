import ConfirmDiscardModal from '@/components/ConfirmDiscardModal';
import AppColors from '@/constants/AppColors';
import { clearSession, getUser } from '@/constants/StudentData';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const SETTINGS_ITEMS = [
  { key: 'account',  label: 'Account Details',  icon: 'person-outline' },
  { key: 'history',  label: 'Report History',    icon: 'time-outline' },
  { key: 'password', label: 'Change Password',   icon: 'lock-closed-outline' },
  { key: 'qr',       label: 'QR an Item',         icon: 'qr-code-outline' },
];

function SettingsRow({ icon, label, onPress, isLogout }) {
  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Ionicons
        name={icon}
        size={22}
        color={isLogout ? '#C0392B' : AppColors.textOnLight}
        style={styles.rowIcon}
      />
      <Text style={[styles.rowLabel, isLogout && styles.logoutLabel]}>
        {label}
      </Text>
      {!isLogout && (
        <Ionicons name="chevron-forward" size={20} color={AppColors.background} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const handleLogout = () => setLogoutVisible(true);

  const confirmLogout = async () => {
    setLogoutVisible(false);
    await clearSession();
    router.replace('/login');
  };

  const handleSettingPress = (key) => {
    if (key === 'account') {
      router.push('/(tabs)/profileAccountDetails');
      return;
    }

    if (key === 'password') {
      router.push('/(tabs)/profileChangePassword');
      return;
    }

    if (key === 'qr') {
      router.push('/(tabs)/qrItem');
      return;
    }

    Alert.alert('Coming soon', `"${key}" screen is not yet implemented.`);
  };

  return (
    <View style={styles.container}>

      {/* ── Sign-out confirmation modal ───────────────────────────────────── */}
      <ConfirmDiscardModal
        visible={logoutVisible}
        onKeepEditing={() => setLogoutVisible(false)}
        onDiscard={confirmLogout}
        message="Are you sure you want to sign out of your account?"
        cancelLabel="Cancel"
        confirmLabel="Log out"
      />

      {/* ── User card ─────────────────────────────────────────────────── */}
      <View style={styles.userCard}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={40} color="#AAAAAA" />
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : user?.email ?? '—'}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.studentId}>Student ID: {user?.student_number ?? '—'}</Text>
        </View>
      </View>

      {/* ── Account Settings section ───────────────────────────────────── */}
      <Text style={styles.sectionHeading}>Account Settings</Text>

      <View style={styles.settingsCard}>
        {SETTINGS_ITEMS.map((item, index) => (
          <View key={item.key}>
            <SettingsRow
              icon={item.icon}
              label={item.label}
              onPress={() => handleSettingPress(item.key)}
            />
            {index < SETTINGS_ITEMS.length - 1 && (
              <View style={styles.rowSeparator} />
            )}
          </View>
        ))}

        <View style={styles.rowSeparator} />
        <SettingsRow
          icon="log-out-outline"
          label="Log out"
          onPress={handleLogout}
          isLogout
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF1E0',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  userCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrapper: {
    marginRight: 16,
  },
  avatarFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textOnLight,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginBottom: 8,
  },
  studentId: {
    fontSize: 14,
    color: AppColors.textMuted,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.textOnLight,
    marginBottom: 14,
    paddingLeft: 4,
  },
  settingsCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  rowIcon: {
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: AppColors.textOnLight,
  },
  logoutLabel: {
    color: '#C0392B',
    fontWeight: '600',
  },
  rowSeparator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 12,
  },
});