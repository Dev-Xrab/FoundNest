import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import { showToast } from "@/components/GlobalToast";
import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import { fetchWithAuth, uploadWithAuth } from "@/constants/authApi";
import { getUserProfile, saveProfileCache } from "@/constants/profile";
import PhotoPickerModal from "@/shared/components/PhotoPickerModal";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { showPermissionAlert } from "@/shared/utils/permissions";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AccountDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState(null);
  const [contactNumber, setContactNumber] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contactError, setContactError] = useState("");
  const [confirmSaveVisible, setConfirmSaveVisible] = useState(false);

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getUserProfile();
        if (!data) return;

        setUser(data);
        setContactNumber(data.contact_number ?? "");
      } catch (err) {
        console.error("Load profile error:", err);
      }
    }

    loadProfile();
  }, []);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsEditing(false);
        setContactError("");
        setContactNumber(userRef.current?.contact_number ?? "");
      };
    }, []),
  );

  const hasChanges = contactNumber !== (user?.contact_number ?? "");

  const validateContact = (value) => {
    const digits = value.trim();
    return /^09\d{9}$/.test(digits);
  };

  const handleEdit = () => {
    setContactError("");
    setIsEditing(true);
  };

  const {
    discardVisible,
    requestCancel,
    requestLeave: handleLeavePress,
    confirmDiscard: handleDiscard,
    dismissDiscard,
  } = useUnsavedChangesGuard(hasChanges, (isLeaving) => {
    setContactNumber(user?.contact_number ?? "");
    setContactError("");
    setIsEditing(false);
    if (isLeaving) {
      router.navigate("/(tabs)/profile");
    }
  });

  // Pressing Cancel with no edits made yet just exits edit mode — nothing to
  // confirm. With edits, it goes through the same discard-confirmation as
  // leaving the screen.
  const handleCancel = () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }
    requestCancel();
  };

  const handleSavePress = () => {
    if (!validateContact(contactNumber)) {
      setContactError("Please enter a valid contact number.");
      return;
    }

    setContactError("");
    setConfirmSaveVisible(true);
  };

  const executeSave = async () => {
    setConfirmSaveVisible(false);
    setIsSaving(true);

    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/profile/${user.user_id}`,
        {
          method: "PUT",
          body: JSON.stringify({ contact_number: contactNumber.trim() }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Failed to save changes.", "error");
        return;
      }

      const trimmedContact = contactNumber.trim();
      const updated = { ...user, contact_number: trimmedContact };
      setUser(updated);
      setContactNumber(trimmedContact);
      await saveProfileCache(updated);
      setIsEditing(false);
      showToast("Changes saved successfully.");
    } catch (err) {
      console.error("Save profile error:", err);
      showToast("Could not connect to server.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ---- PROFILE PICTURE HANDLERS ----

  const uploadProfileImage = async (asset) => {
    setIsUploadingPhoto(true);
    try {
      const filename = asset.uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename ?? "");
      const ext = match ? match[1] : "jpg";

      const formData = new FormData();
      formData.append("profile_image", {
        uri: asset.uri,
        name: filename || `profile.${ext}`,
        type: `image/${ext}`,
      });

      // uploadWithAuth handles token expiry + silent refresh automatically
      // Do NOT use fetchWithAuth here — it forces Content-Type: application/json
      // which breaks multipart/form-data boundary
      const res = await uploadWithAuth(
        `${API_BASE_URL}/api/profile/${user.user_id}/picture`,
        formData,
        "PUT",
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Failed to update profile picture.", "error");
        return;
      }

      const updated = { ...user, profile_image_url: data.profile_image_url };
      setUser(updated);
      await saveProfileCache(updated);
      showToast("Profile picture updated.");
    } catch (err) {
      console.error("Upload profile image error:", err);
      showToast("Could not connect to server.", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removeProfileImage = async () => {
    setIsUploadingPhoto(true);
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/profile/${user.user_id}/picture`,
        { method: "DELETE" },
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Failed to remove profile picture.", "error");
        return;
      }

      const updated = { ...user, profile_image_url: null };
      setUser(updated);
      await saveProfileCache(updated);
      showToast("Profile picture removed.");
    } catch (err) {
      console.error("Remove profile image error:", err);
      showToast("Could not connect to server.", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    setPhotoModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showPermissionAlert("Camera access is required to take a profile photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      await uploadProfileImage(result.assets[0]);
    }
  };

  const handleChooseFromLibrary = async () => {
    setPhotoModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showPermissionAlert("Photo library access is required to choose a profile photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      await uploadProfileImage(result.assets[0]);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoModalVisible(false);
    Alert.alert(
      "Remove Profile Picture",
      "Are you sure you want to remove your profile picture?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: removeProfileImage },
      ],
    );
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.background} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <ConfirmDiscardModal
        visible={discardVisible}
        onKeepEditing={dismissDiscard}
        onDiscard={handleDiscard}
      />

      <ConfirmDiscardModal
        visible={confirmSaveVisible}
        message="Save changes to your contact number?"
        cancelLabel="Cancel"
        confirmLabel="Save"
        onKeepEditing={() => setConfirmSaveVisible(false)}
        onDiscard={executeSave}
      />

      <PhotoPickerModal
        visible={photoModalVisible}
        title="Change Profile Picture"
        hasPhoto={!!user.profile_image_url}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
        onRemovePhoto={handleRemovePhoto}
        onClose={() => setPhotoModalVisible(false)}
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
              <Image
                source={{ uri: user.profile_image_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={46} color="#A8A8A8" />
              </View>
            )}

            {isUploadingPhoto && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}

            <TouchableOpacity
              style={styles.editAvatarBadge}
              activeOpacity={0.7}
              onPress={() => setPhotoModalVisible(true)}
              disabled={isUploadingPhoto}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={AppColors.background}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* WHITE CARD */}
        <View style={styles.fieldsCard}>
          {/* STUDENT NUMBER */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Student Number</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>
                {user.student_number ?? "—"}
              </Text>
            </View>
          </View>

          {/* FIRST NAME */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>{user.first_name ?? "—"}</Text>
            </View>
          </View>

          {/* LAST NAME */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>{user.last_name ?? "—"}</Text>
            </View>
          </View>

          {/* CONTACT NUMBER */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Contact Number</Text>
            <View
              style={[
                styles.fieldBox,
                isEditing && styles.fieldBoxActive,
                contactError ? styles.fieldBoxError : null,
              ]}
            >
              <TextInput
                style={styles.fieldInput}
                value={contactNumber}
                onChangeText={(text) => {
                  setContactNumber(text);
                  if (contactError) setContactError("");
                }}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="e.g. 09171234567"
                placeholderTextColor="#B0B0B0"
              />
              {!isEditing && (
                <TouchableOpacity onPress={handleEdit} activeOpacity={0.7}>
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={AppColors.background}
                  />
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
              <Text style={styles.fieldValue}>{user.email ?? "—"}</Text>
            </View>
          </View>

          {/* BUTTONS */}
          <View style={styles.buttonsSection}>
            <TouchableOpacity
              style={[styles.saveButton, !hasChanges && styles.buttonDisabled]}
              onPress={handleSavePress}
              disabled={!hasChanges || isSaving}
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
              <Text
                style={[
                  styles.cancelButtonText,
                  !isEditing && styles.cancelTextDisabled,
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF1E0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF1E0",
  },
  container: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  redHeader: {
    backgroundColor: AppColors.background,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 70,
  },
  backButton: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  redHeaderTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.surface,
    marginLeft: 4,
  },
  avatarSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 20,
  },
  avatarWrapper: {
    position: "relative",
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
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDDDDD",
  },
  fieldsCard: {
    backgroundColor: "#FFFFFF",
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
    fontWeight: "700",
    color: AppColors.textOnLight,
    marginBottom: 8,
  },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 56,
    borderWidth: 1,
    borderColor: "#D6D6D6",
  },
  fieldBoxActive: {
    borderColor: AppColors.background,
    borderWidth: 1.5,
  },
  fieldBoxError: {
    borderColor: "#C0392B",
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
    color: "#C0392B",
    marginTop: 6,
    marginLeft: 4,
  },
  buttonsSection: {
    marginTop: 12,
    gap: 12,
  },
  saveButton: {
    backgroundColor: "#990000",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelButton: {
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.background,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.background,
  },
  cancelTextDisabled: {
    color: "rgba(139, 0, 0, 0.3)",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
