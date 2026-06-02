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
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileAccountDetails() {
  const router = useRouter();

  const [user, setUser]                     = useState(null);
  const [contactNumber, setContactNumber]   = useState('');
  const [isEditing, setIsEditing]           = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [contactError, setContactError]     = useState('');
  const [discardVisible, setDiscardVisible] = useState(false);
  const [toast, setToast]                   = useState({ visible: false, type: 'success', message: '' });

  useEffect(() => {
    async function loadProfile() {
      try {
        const sessionUser = await getUser();
        if (!sessionUser) return;

        const res = await fetchWithAuth(
          `${API_BASE_URL}/api/profile/${sessionUser.user_id}`
        );
        const data = await res.json();

        if (!res.ok) {
          console.error('Failed to load profile:', data.message);
          return;
        }

        setUser(data);
        setContactNumber(data.contact_number ?? '');
      } catch (err) {
        console.error('Load profile error:', err);
      }
    }

    loadProfile();
  }, []);

  const hasChanges = contactNumber !== (user?.contact_number ?? '');

  const validateContact = (value) => {
    const digits = value.trim();
    return /^09\d{9}$/.test(digits);
  };

  const handleEdit = () => {
    setContactError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (hasChanges) {
      setDiscardVisible(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleDiscard = () => {
    setContactNumber(user?.contact_number ?? '');
    setContactError('');
    setIsEditing(false);
    setDiscardVisible(false);
  };

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
  };

  const handleSave = async () => {
    if (!validateContact(contactNumber)) {
      setContactError('Please enter a valid contact number.');
      return;
    }

    setContactError('');
    setIsSaving(true);

    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/profile/${user.user_id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ contact_number: contactNumber.trim() }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.message || 'Failed to save changes.');
        return;
      }

      setUser((prev) => ({ ...prev, contact_number: contactNumber.trim() }));
      setIsEditing(false);
      showToast('success', 'Changes saved successfully.');
    } catch (err) {
      console.error('Save profile error:', err);
      showToast('error', 'Could not connect to server.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.background} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ConfirmDiscardModal
        visible={discardVisible}
        onKeepEditing={() => setDiscardVisible(false)}
        onDiscard={handleDiscard}
      />

      {/* RED HEADER */}
      <View style={styles.redHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.redHeaderTitle}>Account Details</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* AVATAR */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {user.profile_image_url ? (
              <Image source={{ uri: user.profile_image_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={46} color="#A8A8A8" />
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarBadge} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={16} color={AppColors.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* WHITE CARD */}
        <View style={styles.fieldsCard}>

          {/* STUDENT NUMBER */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Student Number</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>{user.student_number ?? '—'}</Text>
            </View>
          </View>

          {/* FIRST NAME */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>{user.first_name ?? '—'}</Text>
            </View>
          </View>

          {/* LAST NAME */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>{user.last_name ?? '—'}</Text>
            </View>
          </View>

          {/* CONTACT NUMBER */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Contact Number</Text>
            <View style={[
              styles.fieldBox,
              isEditing && styles.fieldBoxActive,
              contactError ? styles.fieldBoxError : null,
            ]}>
              <TextInput
                style={styles.fieldInput}
                value={contactNumber}
                onChangeText={(text) => {
                  setContactNumber(text);
                  if (contactError) setContactError('');
                }}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="e.g. 09171234567"
                placeholderTextColor="#B0B0B0"
              />
              {!isEditing && (
                <TouchableOpacity onPress={handleEdit} activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={20} color={AppColors.background} />
                </TouchableOpacity>
              )}
            </View>
            {contactError ? (
              <Text style={styles.errorText}>{contactError}</Text>
            ) : null}
          </View>

          {/* EMAIL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>{user.email ?? '—'}</Text>
            </View>
          </View>

          {/* BUTTONS */}
          <View style={styles.buttonsSection}>
            <TouchableOpacity
              style={[styles.saveButton, !isEditing && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!isEditing || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, !isEditing && styles.buttonDisabled]}
              onPress={handleCancel}
              disabled={!isEditing}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, !isEditing && styles.cancelTextDisabled]}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF1E0',
  },
  container: {
    paddingBottom: 40,
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
  avatarSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  fieldsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 20,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textOnLight,
    marginBottom: 8,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 56,
    borderWidth: 1,
    borderColor: '#D6D6D6',
  },
  fieldBoxActive: {
    borderColor: AppColors.background,
    borderWidth: 1.5,
  },
  fieldBoxError: {
    borderColor: '#C0392B',
    borderWidth: 1.5,
  },
  fieldValue: {
    flex: 1,
    fontSize: 16,
    color: AppColors.textOnLight,
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
    marginTop: 6,
    marginLeft: 4,
  },
  buttonsSection: {
    marginTop: 12,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#990000',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
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