import PhotoPickerModal from "@/shared/components/PhotoPickerModal";
import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import AppColors from "@/constants/AppColors";
import { getCategories, matchCategoryFromAi } from "@/constants/category";
import { DescribeItem } from "@/constants/geminiAI";
import { isOnline } from "@/constants/offlineDb";
import { setIsAnalyzing } from "@/constants/lostReports";
import { setReportDraft, getReportDraft, setReportPage1Dirty, getReportPage1Dirty } from "@/constants/reportDraft";
import { validateReportPage1 } from "@/utils/lostReport";
import { MaterialIcons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

export default function ReportScreen() {
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [itemName, setItemName] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [contents, setContents] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [online, setOnline] = useState(true);
  const router = useRouter();

  // --- Generic Alert Modal Config State ---
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    message: "",
    cancelLabel: "Dismiss",
    confirmLabel: null,
    onConfirm: () => {},
  });

  const showAlert = ({
    message,
    cancelLabel = "Dismiss",
    confirmLabel = null,
    onConfirm = () => {},
  }) => {
    setAlertConfig({
      visible: true,
      message,
      cancelLabel,
      confirmLabel,
      onConfirm: () => {
        onConfirm();
        setAlertConfig((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  // ── LIVE NETWORK LISTENER ──
  useEffect(() => {
    // Initial fetch check
    isOnline().then(setOnline);

    // Dynamic live subscription
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setOnline(isConnected);
    });

    return () => unsubscribe();
  }, []);

  const categoryDropdownData = categories.map((cat) => ({
    label: cat.category_name,
    value: String(cat.category_id),
  }));

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Keep the shared "unsaved input" flag in sync so the tabs layout can warn
  // on navigation away, even before a formal draft exists (i.e. before Next).
  useEffect(() => {
    const hasUnsavedInput =
      selectedImage !== null ||
      selectedCategoryId !== "" ||
      itemName.trim() !== "" ||
      detailedDescription.trim() !== "" ||
      contents.trim() !== "";
    setReportPage1Dirty(hasUnsavedInput);
  }, [selectedImage, selectedCategoryId, itemName, detailedDescription, contents]);

  // Clear the flag once this screen is torn down so it never leaks to
  // another tab after the user has actually left.
  useEffect(() => {
    return () => setReportPage1Dirty(false);
  }, []);

  // Reset or hydrate fields whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      isOnline().then(setOnline);
      const currentDraft = getReportDraft();

      if (currentDraft) {
        setSelectedImage(currentDraft.imageUri || null);
        setSelectedCategoryId(
          currentDraft.categoryId ? String(currentDraft.categoryId) : ""
        );
        setItemName(currentDraft.itemName || "");
        setDetailedDescription(currentDraft.description || "");
        setContents(currentDraft.contents || "");
      } else if (!getReportPage1Dirty()) {
        // Only wipe the form on a genuinely fresh visit. If there's no
        // formal draft yet but the user has unsaved page-1 input (e.g. the
        // discard-confirmation guard just bounced them back mid-edit),
        // leave the fields alone so nothing vanishes before they decide.
        setSelectedImage(null);
        setSelectedCategoryId("");
        setItemName("");
        setDetailedDescription("");
        setContents("");
        setErrors({});
      }
    }, [])
  );

  const analyzeImage = async (uri) => {
    setIsLoading(true);
    setIsAnalyzing(true);
    try {
      let categoryList = categories;
      if (categoryList.length === 0) {
        categoryList = await getCategories();
        setCategories(categoryList);
      }

      const aiResult = await DescribeItem({
        imageUri: uri,
      });

      if (aiResult) {
        setItemName(aiResult.itemName || "");
        setDetailedDescription(aiResult.detailedDescription || "");
        setContents(aiResult.contents || "");

        const matched = matchCategoryFromAi(aiResult.category, categoryList);
        if (matched) {
          setSelectedCategoryId(String(matched.category_id));
        }
      }
    } catch (error) {
      console.error("AI Analysis Failed:", error);
      showAlert({
        message: "Failed to auto-fill details. Please fill them out manually.",
      });
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  const handleClearAll = () => {
    if (!online) return;
    setClearModalVisible(true);
  };

  const confirmClearAll = () => {
    setSelectedImage(null);
    setSelectedCategoryId("");
    setItemName("");
    setDetailedDescription("");
    setContents("");
    setErrors({});
    setReportDraft(null);
    setClearModalVisible(false);
  };

  const handleTakePhoto = async () => {
    setModalVisible(false);
    const permissionResult =
      await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert({
        message: "You need to allow camera access to take photos.",
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      aspect: [4, 3],
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
      showAlert({
        message: "You need to allow library access to select files.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      aspect: [4, 3],
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

  const handleNext = async () => {
    const currentlyOnline = await isOnline();
    if (!currentlyOnline) {
      setOnline(false);
      showAlert({
        message: "Form submission is unavailable while offline.",
      });
      return;
    }

    const validation = validateReportPage1({
      categoryId: selectedCategoryId,
      itemName,
      description: detailedDescription,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      showAlert({
        message: "Please fix the highlighted fields before continuing.",
        cancelLabel: "Got It",
      });
      return;
    }

    setErrors({});
    setReportDraft({
      imageUri: selectedImage,
      categoryId: selectedCategoryId,
      itemName: itemName.trim(),
      description: detailedDescription.trim(),
      contents: contents.trim(),
      createdAt: Date.now(),
    });

    router.push("/(tabs)/reportNextPage");
  };

  const renderDropdownItem = (item) => {
    return (
      <View style={styles.categoryItemRow}>
        <Text style={styles.categoryItemText}>{item.label}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screenContainer}
    >
      <PhotoPickerModal
        visible={modalVisible}
        hasPhoto={!!selectedImage}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
        onRemovePhoto={handleRemovePhoto}
        onClose={() => setModalVisible(false)}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Lost Item Report Form</Text>



        {/* ── Native lock on all input interaction when offline ── */}
        <View pointerEvents={!online ? "none" : "auto"}>
          <Text style={styles.subTitle}>Item Description</Text>

          <View style={styles.uploadCardWrapper}>
            <View style={[styles.card, !online && styles.disabledOpacity]}>
              <TouchableOpacity
                style={styles.uploadTarget}
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
                disabled={isLoading || !online}
              >
                {isLoading ? (
                  <View style={[styles.dashedRing, { borderColor: "#CCC" }]}>
                    <ActivityIndicator size="large" color="#900000" />
                  </View>
                ) : selectedImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.previewImage}
                    />
                    {online && (
                      <View style={styles.changeBadge}>
                        <MaterialIcons name="edit" size={16} color="#FFFFFF" />
                      </View>
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

              <Text style={styles.titleText}>
                {isLoading
                  ? "Analyzing image..."
                  : "Upload Item Photo (Optional)"}
              </Text>
              <Text style={styles.subText}>
                *FoundNest AI will help auto-fill details based on your photo.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Category</Text>

          <Dropdown
            style={[
              styles.categoryDropdown,
              errors.category && styles.inputErrorBorder,
              !online && styles.disabledInput,
            ]}
            placeholderStyle={styles.categoryPlaceholder}
            selectedTextStyle={styles.categorySelectedText}
            containerStyle={styles.categoryDropdownContainer}
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
              if (errors.category)
                setErrors((prev) => ({ ...prev, category: undefined }));
            }}
            renderItem={renderDropdownItem}
            dropdownPosition="bottom"
            autoScroll={false}
            renderRightIcon={() => (
              <MaterialIcons
                name="keyboard-arrow-down"
                size={24}
                color={online ? AppColors.background : "#A0A0A0"}
              />
            )}
          />
          <FieldError message={errors.category} />

          <Text style={styles.sectionTitle}>Item Name</Text>
          <TextInput
            editable={online}
            style={[
              styles.picker,
              errors.itemName && styles.inputErrorBorder,
              !online && styles.disabledInput,
            ]}
            placeholder="e.g., iPhone 13 Pro Max, Bag, Umbrella"
            placeholderTextColor="#8C7A70"
            value={itemName}
            onChangeText={(text) => {
              setItemName(text);
              if (errors.itemName)
                setErrors((prev) => ({ ...prev, itemName: undefined }));
            }}
          />
          <FieldError message={errors.itemName} />

          <Text style={styles.sectionTitle}>Detailed Description</Text>
          <TextInput
            editable={online}
            style={[
              styles.picker,
              styles.multilineInput,
              errors.description && styles.inputErrorBorder,
              !online && styles.disabledInput,
            ]}
            maxHeight={140}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            placeholder="Brand, Model, Size, Color, Material, etc."
            placeholderTextColor="#8C7A70"
            value={detailedDescription}
            onChangeText={(text) => {
              setDetailedDescription(text);
              if (errors.description)
                setErrors((prev) => ({ ...prev, description: undefined }));
            }}
          />
          <FieldError message={errors.description} />

          <Text style={styles.sectionTitle}>Contents (if applicable)</Text>
          <TextInput
            editable={online}
            style={[styles.picker, !online && styles.disabledInput]}
            placeholder="e.g., wallet contents, keys, notes..."
            placeholderTextColor="#8C7A70"
            value={contents}
            onChangeText={setContents}
          />

          <View style={styles.nextSection}>
            <Text style={styles.pageIndicator}>Page 1 out of 2</Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.clearButton, !online && styles.disabledClearBtn]}
                onPress={handleClearAll}
                disabled={!online}
              >
                <Text
                  style={[
                    styles.clearButtonText,
                    !online && { color: "#A0A0A0" },
                  ]}
                >
                  Clear All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextButton, !online && styles.disabledNextBtn]}
                onPress={handleNext}
                disabled={!online}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ConfirmDiscardModal
          visible={clearModalVisible}
          message="Clear all entered data? This action cannot be undone."
          cancelLabel="Cancel"
          confirmLabel="Clear"
          onKeepEditing={() => setClearModalVisible(false)}
          onDiscard={confirmClearAll}
        />

        <ConfirmDiscardModal
          visible={alertConfig.visible}
          message={alertConfig.message}
          cancelLabel={alertConfig.cancelLabel}
          confirmLabel={alertConfig.confirmLabel}
          onKeepEditing={() =>
            setAlertConfig((prev) => ({ ...prev, visible: false }))
          }
          onDiscard={alertConfig.onConfirm}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#FFF1E0", paddingBottom: 40 },
  title: {
    backgroundColor: AppColors.background,
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.surface,
    padding: 20,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineBannerText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  subTitle: {
    borderBottomWidth: 1,
    borderColor: "#000000",
    fontSize: 17,
    fontWeight: "900",
    color: AppColors.textOnLight,
    padding: 20,
    paddingLeft: 10,
    paddingBottom: 15,
    marginHorizontal: 10,
    marginBottom: 20,
  },
  uploadCardWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    width: "100%",
    maxWidth: 450,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  uploadTarget: {
    marginBottom: 20,
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
  titleText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#6B5A52",
    textAlign: "center",
    marginBottom: 14,
  },
  subText: {
    fontSize: 13,
    color: "#8C7A70",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: AppColors.textOnLight,
    paddingLeft: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  categoryDropdown: {
    marginHorizontal: 20,
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  categoryPlaceholder: { fontSize: 16, color: "#8C7A70" },
  categorySelectedText: { fontSize: 16, color: AppColors.textOnLight },
  categoryDropdownContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryItemRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderColor: "#ECECEC",
  },
  categoryItemText: { fontSize: 16, color: AppColors.textOnLight },
  picker: {
    marginHorizontal: 20,
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    justifyContent: "center",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  multilineInput: { height: 140, paddingTop: 12 },
  inputErrorBorder: { borderWidth: 1, borderColor: "#C62828" },
  fieldError: {
    color: "#C62828",
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 4,
  },
  screenContainer: { flex: 1, backgroundColor: "#FFF1E0" },
  imagePreviewContainer: { width: 110, height: 110, position: "relative" },
  previewImage: { width: "100%", height: "100%", borderRadius: 20 },
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
  nextSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 30,
    borderTopWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.24)",
    alignItems: "center",
  },
  pageIndicator: { fontWeight: "bold" },
  nextButton: {
    padding: 10,
    paddingHorizontal: 30,
    backgroundColor: AppColors.background,
    borderRadius: 10,
  },
  buttonText: { color: AppColors.surface },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C62828",
  },
  clearButtonText: {
    color: "#C62828",
    fontWeight: "600",
  },
  disabledInput: {
    backgroundColor: "#E2D7CC",
    color: "#888888",
    borderColor: "#C5B8AC",
  },
  disabledOpacity: {
    opacity: 0.5,
  },
  disabledClearBtn: {
    borderColor: "#C0C0C0",
    backgroundColor: "#EAEAEA",
  },
  disabledNextBtn: {
    backgroundColor: "#A0A0A0",
  },
});