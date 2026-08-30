import ConfirmDiscardModal from '@/components/ConfirmDiscardModal';
import PasswordChecklist from '@/components/PasswordChecklist';
import Toast from '@/components/Toast';
import { API_BASE_URL } from '@/constants/api';
import AppColors from '@/constants/AppColors';
import { fetchWithAuth } from '@/constants/authApi';
import { clearSession, getUser } from '@/constants/StudentData';
import { deletePushToken } from '@/utils/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function PasswordField({ label, value, onChangeText, showPassword, onToggle, error }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, error ? styles.fieldBoxError : null]}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#B0B0B0"
        />
        <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
          <Ionicons
            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="#B0B0B0"
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function ProfileChangePassword() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [user, setUser]                       = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isSaving, setIsSaving]               = useState(false);
  const [discardVisible, setDiscardVisible]   = useState(false);
  const [confirmChangeVisible, setConfirmChangeVisible] = useState(false);
  const [toast, setToast]                     = useState({ visible: false, type: 'success', message: '' });

  const [errors, setErrors] = useState({
    current: '',
    confirm: '',
  });

  // Any field with content is enough to protect against an accidental
  // discard — unlike isFormFilled below, which gates actual submission and
  // requires all three fields.
  const hasChanges =
    currentPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  const isFormFilled =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  const isNewPasswordValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[^a-zA-Z0-9]/.test(newPassword);

  const isConfirmMismatched =
    confirmPassword.length > 0 && confirmPassword !== newPassword;

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  // Always call the latest cancel/leave logic, even from a listener that
  // was registered on an earlier render — avoids stale-closure bugs.
  const handleCancelPressRef = useRef(() => {});
  // Lets confirmed navigations (Discard, or leaving with no changes) through
  // the listeners below without re-triggering the discard check.
  const bypassRef = useRef(false);
  // Distinguishes why the discard modal is open: true if the user tried to
  // leave the screen entirely (back arrow / swipe / hardware back), in which
  // case confirming Discard should navigate away. False if triggered by the
  // in-page Cancel button, which should just clear the form and stay put.
  const pendingLeaveRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      bypassRef.current = false;
      return () => {
        bypassRef.current = false;
      };
    }, [])
  );

  // Catches the iOS edge-swipe gesture and any programmatic navigation away
  // from this screen. Android's back gesture/button is handled separately
  // below via BackHandler, since it doesn't go through beforeRemove.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (bypassRef.current) return;
      e.preventDefault();
      handleCancelPressRef.current();
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (bypassRef.current) return false;
        handleCancelPressRef.current();
        return true;
      });

      return () => subscription.remove();
    }, [])
  );

  const handleCancel = () => {
    if (hasChanges) {
      pendingLeaveRef.current = false;
      setDiscardVisible(true);
    }
  };

  const handleLeavePress = () => {
    if (!hasChanges) {
      bypassRef.current = true;
      router.navigate('/(tabs)/profile');
      return;
    }
    pendingLeaveRef.current = true;
    setDiscardVisible(true);
  };

  useEffect(() => {
    handleCancelPressRef.current = handleLeavePress;
  });

  const handleDiscard = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({ current: '', confirm: '' });
    setDiscardVisible(false);

    if (pendingLeaveRef.current) {
      pendingLeaveRef.current = false;
      bypassRef.current = true;
      router.navigate('/(tabs)/profile');
    }
  };

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
  };

  const handleNewPasswordChange = (text) => {
    setNewPassword(text);
    if (confirmPassword.length > 0) {
      setErrors((e) => ({
        ...e,
        confirm: confirmPassword !== text ? 'Passwords do not match.' : '',
      }));
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    setErrors((e) => ({
      ...e,
      confirm: text.length > 0 && text !== newPassword ? 'Passwords do not match.' : '',
    }));
  };

  // Validates the form and, if it passes, opens a confirmation step before
  // actually submitting — this action logs the user out on success, so it's
  // worth an explicit "are you sure" rather than firing immediately.
  const handleChangePasswordPress = () => {
    const newErrors = { current: '', confirm: '' };
    let hasError = false;

    if (!isNewPasswordValid) {
      hasError = true;
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match.';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setErrors({ current: '', confirm: '' });
    setConfirmChangeVisible(true);
  };

  const executeChangePassword = async () => {
    setConfirmChangeVisible(false);
    setIsSaving(true);

    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/profile/${user.user_id}/change-password`,
        {
          method: 'PUT',
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setErrors((e) => ({ ...e, current: data.message }));
        } else {
          showToast('error', data.message || 'Failed to change password.');
        }
        return;
      }

      await deletePushToken();
      await clearSession();
      router.replace({
        pathname: '/login',
        params: { passwordChangedSuccess: '1' },
      });
    } catch (err) {
      console.error('Change password error:', err);
      showToast('error', 'Could not connect to server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <ConfirmDiscardModal
        visible={discardVisible}
        onKeepEditing={() => {
          pendingLeaveRef.current = false;
          setDiscardVisible(false);
        }}
        onDiscard={handleDiscard}
      />

      <ConfirmDiscardModal
        visible={confirmChangeVisible}
        message="Changing your password will log you out of this device. Are you sure you want to continue?"
        cancelLabel="Cancel"
        confirmLabel="Change Password"
        onKeepEditing={() => setConfirmChangeVisible(false)}
        onDiscard={executeChangePassword}
      />

      <View style={[styles.redHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleLeavePress}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.redHeaderTitle}>Change Password</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fieldsCard}>

          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (errors.current) setErrors((e) => ({ ...e, current: '' }));
            }}
            showPassword={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            error={errors.current}
          />

          {/* New Password + live checklist */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.fieldBox}>
              <TextInput
                style={styles.fieldInput}
                value={newPassword}
                onChangeText={handleNewPasswordChange}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#B0B0B0"
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} activeOpacity={0.7}>
                <Ionicons
                  name={showNew ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#B0B0B0"
                />
              </TouchableOpacity>
            </View>
            {newPassword.length > 0 && <PasswordChecklist password={newPassword} />}
          </View>

          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            showPassword={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            error={errors.confirm}
          />

          {/* BUTTONS */}
          <View style={styles.buttonsSection}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isFormFilled || !isNewPasswordValid || isConfirmMismatched) && styles.buttonDisabled,
              ]}
              onPress={handleChangePasswordPress}
              disabled={!isFormFilled || !isNewPasswordValid || isConfirmMismatched || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, !hasChanges && styles.buttonDisabled]}
              onPress={handleCancel}
              disabled={!hasChanges}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, !hasChanges && styles.cancelTextDisabled]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <Toast
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF1E0',
  },
  redHeader: {
    backgroundColor: AppColors.background,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  redHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.surface,
    marginLeft: 4,
  },
  container: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  fieldsCard: {
    backgroundColor: AppColors.surface,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textOnLight,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 56,
    borderWidth: 1,
    borderColor: '#D6D6D6',
  },
  fieldBoxError: {
    borderColor: '#C0392B',
    borderWidth: 1.5,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textOnLight,
    padding: 0,
  },
  errorText: {
    fontSize: 13,
    color: '#C0392B',
    marginTop: 2,
    marginLeft: 4,
  },
  buttonsSection: {
    marginTop: 4,
    gap: 12,
  },
  saveButton: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.surface,
  },
  cancelButton: {
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.background,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.background,
  },
  cancelTextDisabled: {
    color: 'rgba(139, 0, 0, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});