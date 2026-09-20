import AppColors from '@/constants/AppColors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ROLE_LABELS = {
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export default function RoleGateModal({
  visible,
  role,
  onContinueAsAdmin,
  onLoginAsEndUser,
}) {
  const roleLabel = ROLE_LABELS[role] || 'Admin';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onLoginAsEndUser}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>You're logged in as {roleLabel}</Text>
          <Text style={styles.subtitle}>
            {roleLabel} accounts manage FoundNest from the web portal. Choose
            how you'd like to continue.
          </Text>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.optionRow}
            onPress={onContinueAsAdmin}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={AppColors.background}
              />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Continue as {roleLabel}</Text>
              <Text style={styles.optionSubtitle}>
                Opens the web admin portal
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={AppColors.inactiveIcon} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.optionRow}
            onPress={onLoginAsEndUser}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Ionicons name="person-outline" size={20} color={AppColors.background} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Login as End User</Text>
              <Text style={styles.optionSubtitle}>
                Sign in with a different account
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={AppColors.inactiveIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: '85%',
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    paddingTop: 22,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: AppColors.textOnLight,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: AppColors.textMuted,
    paddingHorizontal: 20,
    paddingBottom: 18,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.separator,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: AppColors.separator,
    marginLeft: 20,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.textOnLight,
  },
  optionSubtitle: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 2,
  },
});