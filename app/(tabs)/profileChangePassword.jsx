import ConfirmDiscardModal from '@/components/ConfirmDiscardModal';
import Toast from '@/components/Toast';
import { API_BASE_URL } from '@/constants/api';
import AppColors from '@/constants/AppColors';
import { fetchWithAuth } from '@/constants/authApi';
import { getUser } from '@/constants/StudentData';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

function PasswordChecklist({ password }) {
  const rules = [
    { label: 'At least 8 characters',        met: password.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least one number',           met: /[0-9]/.test(password) },
    { label: 'At least one special character', met: /[^a-zA-Z0-9]/.test(password) },
  ];

  return (
    <View style={styles.checklist}>
      {rules.map((rule) => (
        <View key={rule.label} style={styles.checklistRow}>
          <Ionicons
            name={rule.met ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={rule.met ? '#2E7D32' : '#C0392B'}
          />
          <Text style={[styles.checklistText, { color: rule.met ? '#2E7D32' : '#C0392B' }]}>
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function ProfileChangePassword() {
  const router = useRouter();

  const [user, setUser]                       = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [isSaving, setIsSaving]               = useState(false);
  const [discardVisible, setDiscardVisible]   = useState(false);
  const [toast, setToast]                     = useState({ visible: false, type: 'success', message: '' });

  const [errors, setErrors] = useState({
    current: '',
    confirm: '',
  });

  const isFormFilled =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  const isNewPasswordValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[^a-zA-Z0-9]/.test(newPassword);

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const handleCancel = () => {
    if (isFormFilled) {
      setDiscardVisible(true);
    }
  };

  const handleDiscard = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({ current: '', confirm: '' });
    setDiscardVisible(false);
  };

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
  };

  const handleChangePassword = async () => {
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

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Password changed successfully.');

    } catch (err) {
      console.error('Change password error:', err);
      showToast('error', 'Could not connect to server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ConfirmDiscardModal
        visible={discardVisible}
        onKeepEditing={() => setDiscardVisible(false)}
        onDiscard={handleDiscard}
      />

      {/* HEADER */}
      <View style={styles.redHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
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
                onChangeText={setNewPassword}
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
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirm) setErrors((e) => ({ ...e, confirm: '' }));
            }}
            showPassword={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            error={errors.confirm}
          />

          {/* BUTTONS */}
          <View style={styles.buttonsSection}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isFormFilled || !isNewPasswordValid) && styles.buttonDisabled,
              ]}
              onPress={handleChangePassword}
              disabled={!isFormFilled || !isNewPasswordValid || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, !isFormFilled && styles.buttonDisabled]}
              onPress={handleCancel}
              disabled={!isFormFilled}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, !isFormFilled && styles.cancelTextDisabled]}>
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
    </View>
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
  checklist: {
    marginTop: 8,
    gap: 4,
    paddingLeft: 4,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistText: {
    fontSize: 13,
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
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D48B8B',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textOnLight,
  },
  cancelTextDisabled: {
    color: 'rgba(0,0,0,0.3)',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});