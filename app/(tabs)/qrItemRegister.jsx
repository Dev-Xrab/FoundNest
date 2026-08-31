import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import ChangePhotoModal from "@/components/InsertEditImage";
import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import { uploadWithAuth } from "@/constants/authApi";
import { getCategories, matchCategoryFromAi } from "@/constants/category";
import { DescribeItem } from "@/constants/geminiAI";
import { setIsAnalyzing as setGlobalAnalyzing } from "@/constants/lostReports";
import { isOnline } from "@/constants/offlineDb";
import { getUserProfile } from "@/constants/profile";
import { upsertQrItemInCache } from "@/constants/qrItems";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
import { Dropdown } from "react-native-element-dropdown";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

// Label for editable fields (no asterisk)
function RequiredLabel({ label }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function ReadOnlyField({ label, value }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{value || "—"}</Text>
      </View>
    </View>
  );
}

export default function QrItemRegister() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Session / owner info
  const [user, setUser] = useState(null);

  // Item description fields
  const [selectedImage, setSelectedImage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [contents, setContents] = useState("");

  // Contact number — read-only, auto-filled from profile
  const [contactNumber, setContactNumber] = useState("");

  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [discardVisible, setDiscardVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [online, setOnline] = useState(true);

  // --- Custom Confirm/Alert Modal Config State ---
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    message: "",
    cancelLabel: "Cancel",
    confirmLabel: "OK",
    onConfirm: () => {},
  });

  const showCustomAlert = ({
    message,
    cancelLabel = "Cancel",
    confirmLabel = "OK",
    onConfirm = () => {},
  }) => {
    setModalConfig({
      visible: true,
      message,
      cancelLabel,
      confirmLabel,
      onConfirm: () => {
        onConfirm();
        setModalConfig((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  // ── LIVE NETWORK LISTENER ──
  useEffect(() => {
    isOnline().then(setOnline);

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setOnline(isConnected);
    });

    return () => unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      isOnline().then(setOnline);
      return () => {
        // Runs when screen loses focus — clears all inputs
        setSelectedImage(null);
        setSelectedCategoryId("");
        setSelectedCategoryName("");
        setItemName("");
        setDescription("");
        setContents("");
        setErrors({});
        setDiscardVisible(false);
      };
    }, [])
  );

  const categoryDropdownData = categories.map((cat) => ({
    label: cat.category_name,
    value: String(cat.category_id),
    name: cat.category_name,
  }));

  useEffect(() => {
    async function load() {
      try {
        const data = await getUserProfile();
        if (data) {
          setUser(data);
          setContactNumber(data.contact_number ?? "");
        }
      } catch {
        // getUserProfile already falls back to cached / session user
      }

      getCategories().then(setCategories);
    }
    load();
  }, []);

  // Detect if any field has been touched
  const hasChanges =
    selectedImage !== null ||
    selectedCategoryId !== "" ||
    itemName.trim() !== "" ||
    description.trim() !== "" ||
    contents.trim() !== "";

  // ── AI image analysis ──────────────────────────────────────────────────────
  const analyzeImage = async (uri) => {
    setIsAnalyzing(true);
    setGlobalAnalyzing(true);
    try {
      let categoryList = categories;
      if (categoryList.length === 0) {
        categoryList = await getCategories();
        setCategories(categoryList);
      }

      const aiResult = await DescribeItem({
        imageUri: uri,
        categoryOptions: categoryList.map((c) => c.category_name),
      });

      if (aiResult) {
        setItemName(aiResult.itemName || "");
        setDescription(aiResult.detailedDescription || "");
        setContents(aiResult.contents || "");

        const matched = matchCategoryFromAi(aiResult.category, categoryList);
        if (matched) {
          setSelectedCategoryId(String(matched.category_id));
          setSelectedCategoryName(matched.category_name);
        }
      }
    } catch (err) {
      console.error("AI analysis failed:", err);
      Alert.alert(
        "AI Error",
        "Failed to auto-fill details. Please fill them in manually."
      );
    } finally {
      setIsAnalyzing(false);
      setGlobalAnalyzing(false);
    }
  };

  const handleTakePhoto = async () => {
    setModalVisible(false);
    const permissionResult =
      await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Denied",
        "You need to allow camera access to take photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      analyzeImage(uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    setModalVisible(false);
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Denied",
        "You need to allow library access to select files."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      analyzeImage(uri);
    }
  };

  const handleRemovePhoto = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!selectedCategoryId) newErrors.category = "Please select a category.";
    if (!itemName.trim()) newErrors.itemName = "Item name is required.";
    if (!description.trim()) newErrors.description = "Description is required.";
    return newErrors;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const executeSubmission = async () => {
    setErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("user_id", String(user.user_id));
      formData.append("item_name", itemName.trim());
      formData.append(
        "category_id",
        selectedCategoryId ? String(selectedCategoryId) : ""
      );
      formData.append("description", description.trim());

      if (selectedImage) {
        const fileName = selectedImage.split("/").pop() || "item-photo.jpg";
        const extension = fileName.split(".").pop()?.toLowerCase();
        const mimeType =
          extension === "png"
            ? "image/png"
            : extension === "webp"
            ? "image/webp"
            : "image/jpeg";

        formData.append("image", {
          uri: selectedImage,
          name: fileName.includes(".") ? fileName : `${fileName}.jpg`,
          type: mimeType,
        });
      }

      const res = await uploadWithAuth(
        `${API_BASE_URL}/api/qr-items/register`,
        formData
      );

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to register item.");
        return;
      }

      if (data.qr_code) {
        await upsertQrItemInCache(data.qr_code);
      }

      router.replace({
        pathname: "/(tabs)/qrItemSuccess",
        params: {
          qr_data: data.qr_code?.qr_data,
          itemName: itemName.trim(),
        },
      });
    } catch (err) {
      console.error("Register QR item error:", err);
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    const currentlyOnline = await isOnline();
    if (!currentlyOnline) {
      setOnline(false);
      Alert.alert("Offline", "Cannot register items while offline.");
      return;
    }

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert("Missing information", "Please fix the highlighted fields.");
      return;
    }

    showCustomAlert({
      message: "Are you sure you want to register this item?",
      cancelLabel: "Review",
      confirmLabel: "Register",
      onConfirm: executeSubmission,
    });
  };

  // ── Cancel / discard ───────────────────────────────────────────────────────
  const handleCancel = () => {
    if (hasChanges) {
      setDiscardVisible(true);
    } else {
      bypassRef.current = true;
      router.replace("/(tabs)/qrItem");
    }
  };

  const handleDiscard = () => {
    setDiscardVisible(false);
    bypassRef.current = true;
    router.replace("/(tabs)/qrItem");
  };

  const handleCancelRef = useRef(() => {});
  useEffect(() => {
    handleCancelRef.current = handleCancel;
  });

  const bypassRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      bypassRef.current = false;
      return () => {
        bypassRef.current = false;
      };
    }, [])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (bypassRef.current) return;
      e.preventDefault();
      handleCancelRef.current();
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (bypassRef.current) return false;
          handleCancelRef.current();
          return true;
        }
      );
      return () => subscription.remove();
    }, [])
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <ChangePhotoModal
        visible={modalVisible}
        hasPhoto={!!selectedImage}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
        onRemovePhoto={handleRemovePhoto}
        onClose={() => setModalVisible(false)}
      />

      <ConfirmDiscardModal
        visible={discardVisible}
        onKeepEditing={() => setDiscardVisible(false)}
        onDiscard={handleDiscard}
      />

      <ConfirmDiscardModal
        visible={modalConfig.visible}
        message={modalConfig.message}
        cancelLabel={modalConfig.cancelLabel}
        confirmLabel={modalConfig.confirmLabel}
        onKeepEditing={() =>
          setModalConfig((prev) => ({ ...prev, visible: false }))
        }
        onDiscard={modalConfig.onConfirm}
      />

      {/* RED HEADER */}
      <View style={[styles.redHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleCancel}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register An Item</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* ── OWNER INFO (read-only) ─────────────────────────────────────── */}
        <ReadOnlyField
          label="Owner Name"
          value={user ? `${user.first_name} ${user.last_name}` : ""}
        />
        <ReadOnlyField label="Student Number" value={user?.student_number} />
        <ReadOnlyField
          label="Course and Section"
          value={user?.course_section}
        />

        {/* ── CONTACT NUMBER (read-only) ────────────────────────────────── */}
        <ReadOnlyField label="Contact Number" value={contactNumber} />

        {/* ── ITEM DESCRIPTION heading ──────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Item Description</Text>

        {/* ── INTERACTIVE FORM CONTAINER (LOCKED WHEN OFFLINE) ─────────────── */}
        <View pointerEvents={!online ? "none" : "auto"}>
          {/* ── AI IMAGE UPLOAD CARD ──────────────────────────────────────── */}
          <View style={styles.uploadCardWrapper}>
            <View style={[styles.uploadCard, !online && styles.disabledCard]}>
              <TouchableOpacity
                style={styles.uploadTarget}
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
                disabled={isAnalyzing || !online}
              >
                {isAnalyzing ? (
                  <View style={[styles.dashedRing, { borderColor: "#CCC" }]}>
                    <ActivityIndicator size="large" color="#900000" />
                  </View>
                ) : selectedImage ? (
                  <View style={styles.imagePreviewOuter}>
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: selectedImage }}
                        style={styles.previewImage}
                      />
                      {online && (
                        <View style={styles.changeBadge}>
                          <MaterialIcons
                            name="edit"
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                      )}
                    </View>
                    {online && (
                      <TouchableOpacity
                        style={styles.clearImageButton}
                        onPress={() => setSelectedImage(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#C62828"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.dashedRing,
                      !online && { borderColor: "#A0A0A0" },
                    ]}
                  >
                    <View
                      style={[
                        styles.solidCircle,
                        !online && { backgroundColor: "#A0A0A0" },
                      ]}
                    >
                      <MaterialIcons name="add" size={32} color="#FFFFFF" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.uploadTitle}>
                {isAnalyzing
                  ? "Analyzing Image"
                  : "Upload Item Photo (Optional)"}
              </Text>
              <Text style={styles.uploadSub}>
                *FoundNest AI will help auto-fill details based on your photo.
              </Text>
            </View>
          </View>

          {/* ── CATEGORY ─────────────────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <RequiredLabel label="Category" />
            <Dropdown
              style={[
                styles.dropdown,
                errors.category && styles.inputError,
                !online && styles.disabledInput,
              ]}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelected}
              containerStyle={styles.dropdownContainer}
              itemTextStyle={styles.dropdownItem}
              activeColor="rgba(139,0,0,0.1)"
              data={categoryDropdownData}
              maxHeight={280}
              labelField="label"
              valueField="value"
              placeholder={
                !online
                  ? "Unavailable offline"
                  : categoryDropdownData.length === 0
                  ? "Loading categories..."
                  : "Select Category"
              }
              disable={categoryDropdownData.length === 0 || !online}
              value={selectedCategoryId || null}
              onChange={(item) => {
                setSelectedCategoryId(item.value);
                setSelectedCategoryName(item.name);
                if (errors.category)
                  setErrors((p) => ({ ...p, category: undefined }));
              }}
              renderRightIcon={() => (
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={24}
                  color={online ? AppColors.background : "#A0A0A0"}
                />
              )}
            />
            <FieldError message={errors.category} />
          </View>

          {/* ── ITEM NAME ────────────────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <RequiredLabel label="Item Name" />
            <TextInput
              editable={online}
              style={[
                styles.inputBox,
                errors.itemName && styles.inputError,
                !online && styles.disabledInput,
              ]}
              placeholder="e.g., iPhone 13 Pro Max, Bag, Umbrella"
              placeholderTextColor="#8C7A70"
              value={itemName}
              onChangeText={(text) => {
                setItemName(text);
                if (errors.itemName)
                  setErrors((p) => ({ ...p, itemName: undefined }));
              }}
            />
            <FieldError message={errors.itemName} />
          </View>

          {/* ── DETAILED DESCRIPTION ─────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <RequiredLabel label="Detailed Description" />
            <TextInput
              editable={online}
              style={[
                styles.inputBox,
                styles.multilineInput,
                errors.description && styles.inputError,
                !online && styles.disabledInput,
              ]}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder="Brand, Model, Size, Color, Material, etc."
              placeholderTextColor="#8C7A70"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description)
                  setErrors((p) => ({ ...p, description: undefined }));
              }}
            />
            <FieldError message={errors.description} />
          </View>

          {/* ── CONTENTS ────────────────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.sectionTitle}>Contents (if applicable)</Text>
            <TextInput
              editable={online}
              style={[styles.inputBox, !online && styles.disabledInput]}
              placeholder="e.g., Cash amount, ID name"
              placeholderTextColor="#8C7A70"
              value={contents}
              onChangeText={setContents}
            />
          </View>

          {/* ── ACTION BUTTONS ───────────────────────────────────────────── */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.registerButton,
                (isSubmitting || !online) && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={isSubmitting || !online}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.registerText}>Register</Text>
              )}
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // ── Read-only & input fields ──────────────────────────────────────────────
  fieldGroup: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppColors.textOnLight,
    marginBottom: 6,
  },
  readOnlyBox: {
    backgroundColor: "#EDE0D4",
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: "center",
  },
  readOnlyText: {
    fontSize: 16,
    color: AppColors.textOnLight,
  },
  inputBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: AppColors.textOnLight,
    borderWidth: 1,
    borderColor: "#D6D6D6",
  },
  multilineInput: {
    height: 120,
    paddingTop: 12,
  },
  inputError: {
    borderColor: "#C62828",
    borderWidth: 1.5,
  },
  fieldError: {
    color: "#C62828",
    fontSize: 13,
    marginTop: 4,
  },

  // ── Section heading ───────────────────────────────────────────────────────
  sectionHeading: {
    fontSize: 17,
    fontWeight: "900",
    color: AppColors.textOnLight,
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    paddingBottom: 10,
    marginBottom: 16,
    marginTop: 4,
  },

  // ── AI upload card ────────────────────────────────────────────────────────
  uploadCardWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },
  uploadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledCard: {
    opacity: 0.6,
    backgroundColor: "#EBE5DF",
  },
  uploadTarget: {
    marginBottom: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  dashedRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: "#900000",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  solidCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#900000",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewOuter: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  clearImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  imagePreviewContainer: {
    width: 110,
    height: 110,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  changeBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#900000",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B5A52",
    textAlign: "center",
    marginBottom: 8,
  },
  uploadSub: {
    fontSize: 13,
    color: "#8C7A70",
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Dropdown ──────────────────────────────────────────────────────────────
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: "#D6D6D6",
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: "#8C7A70",
  },
  dropdownSelected: {
    fontSize: 16,
    color: AppColors.textOnLight,
  },
  dropdownContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  dropdownItem: {
    fontSize: 16,
    color: AppColors.textOnLight,
  },

  // ── Disabled & Buttons ───────────────────────────────────────────────────
  disabledInput: {
    backgroundColor: "#E2D7CC",
    borderColor: "#C5B8AC",
    color: "#888888",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    paddingTop: 24,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: "transparent",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AppColors.background,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
    color: AppColors.background,
  },
  registerButton: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    backgroundColor: AppColors.background,
    borderRadius: 14,
    minWidth: 100,
    alignItems: "center",
  },
  registerButtonDisabled: {
    backgroundColor: "#A0A0A0",
    opacity: 0.7,
  },
  registerText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});