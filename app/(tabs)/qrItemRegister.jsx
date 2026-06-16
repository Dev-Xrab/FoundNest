import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import { fetchWithAuth } from "@/constants/authApi";
import { getCategories, matchCategoryFromAi } from "@/constants/category";
import { DescribeItem } from "@/constants/geminiAI";
import { getToken, getUser } from "@/constants/StudentData";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

// Label with a red asterisk for required editable fields
function RequiredLabel({ label }) {
  return (
    <Text style={styles.sectionTitle}>
      {label}
      <Text style={styles.requiredStar}> *</Text>
    </Text>
  );
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

  useFocusEffect(
    useCallback(() => {
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
    }, []),
  );

  const categoryDropdownData = categories.map((cat) => ({
    label: cat.category_name,
    value: String(cat.category_id),
    name: cat.category_name,
  }));

  useEffect(() => {
    async function load() {
      const sessionUser = await getUser();
      if (!sessionUser) return;

      // Fetch full profile to get course_section
      try {
        const res = await fetchWithAuth(
          `${API_BASE_URL}/api/profile/${sessionUser.user_id}`,
        );
        const data = await res.json();
        if (res.ok) {
          setUser(data);
          setContactNumber(data.contact_number ?? "");
        } else {
          setUser(sessionUser);
          setContactNumber(sessionUser.contact_number ?? "");
        }
      } catch {
        setUser(sessionUser);
        setContactNumber(sessionUser.contact_number ?? "");
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
    console.log("Starting AI analysis for image:", uri);
    setIsAnalyzing(true);
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
        "Failed to auto-fill details. Please fill them in manually.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImagePick = () => {
    Alert.alert("Upload Item Photo", "Choose a source for your photo:", [
      {
        text: "Use Camera",
        onPress: async () => {
          const { granted } = await ImagePicker.requestCameraPermissionsAsync();
          if (!granted) {
            Alert.alert(
              "Permission Denied",
              "You need to allow camera access.",
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
        },
      },
      {
        text: "Pick from Gallery",
        onPress: async () => {
          const { granted } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!granted) {
            Alert.alert(
              "Permission Denied",
              "You need to allow library access.",
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
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
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
  const handleRegister = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert("Missing information", "Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const qr_data = JSON.stringify({
        ownerName: `${user.first_name} ${user.last_name}`,
        studentNumber: user.student_number,
        courseSection: user.course_section ?? "",
        contactNumber: contactNumber.trim(),
        itemName: itemName.trim(),
        category: selectedCategoryName,
      });

      // Build multipart/form-data so the backend receives req.file for Cloudinary upload
      const token = await getToken();
      const formData = new FormData();

      formData.append("user_id", String(user.user_id));
      formData.append("item_name", itemName.trim());
      formData.append(
        "category_id",
        selectedCategoryId ? String(selectedCategoryId) : "",
      );
      formData.append("description", description.trim());
      formData.append("qr_data", qr_data);

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

      const res = await fetch(`${API_BASE_URL}/api/qr-items/register`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to register item.");
        return;
      }

      // Navigate to success screen
      router.replace({
        pathname: "/(tabs)/qrItemSuccess",
        params: {
          qr_data,
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

  // ── Cancel / discard ───────────────────────────────────────────────────────
  const handleCancel = () => {
    if (hasChanges) {
      setDiscardVisible(true);
    } else {
      router.replace("/(tabs)/qrItem");
    }
  };

  const handleDiscard = () => {
    setDiscardVisible(false);
    router.replace("/(tabs)/qrItem");
  };

  return (
    <View style={styles.screen}>
      <ConfirmDiscardModal
        visible={discardVisible}
        onKeepEditing={() => setDiscardVisible(false)}
        onDiscard={handleDiscard}
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

        {/* ── AI IMAGE UPLOAD CARD ──────────────────────────────────────── */}
        <View style={styles.uploadCardWrapper}>
          <View style={styles.uploadCard}>
            <TouchableOpacity
              style={styles.uploadTarget}
              activeOpacity={0.7}
              onPress={handleImagePick}
              disabled={isAnalyzing}
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
                    <View style={styles.changeBadge}>
                      <MaterialIcons name="edit" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.clearImageButton}
                    onPress={() => setSelectedImage(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={24} color="#C62828" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.dashedRing}>
                  <View style={styles.solidCircle}>
                    <MaterialIcons name="add" size={32} color="#FFFFFF" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.uploadTitle}>
              {isAnalyzing ? "Analyzing Image" : "Upload Item Photo (Optional)"}
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
            style={[styles.dropdown, errors.category && styles.inputError]}
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
              categoryDropdownData.length === 0
                ? "Loading categories..."
                : "Select Category"
            }
            disable={categoryDropdownData.length === 0}
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
                color={AppColors.background}
              />
            )}
          />
          <FieldError message={errors.category} />
        </View>

        {/* ── ITEM NAME ────────────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <RequiredLabel label="Item Name" />
          <TextInput
            style={[styles.inputBox, errors.itemName && styles.inputError]}
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
            style={[
              styles.inputBox,
              styles.multilineInput,
              errors.description && styles.inputError,
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
            style={styles.inputBox}
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
            style={[styles.registerButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleRegister}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.registerText}>Register</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
  requiredStar: {
    color: "#C62828",
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

  // ── Buttons ───────────────────────────────────────────────────────────────
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    paddingTop: 24,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.background,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.background,
  },
  registerButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppColors.background,
  },
  registerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
