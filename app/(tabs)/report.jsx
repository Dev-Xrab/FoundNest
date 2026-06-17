import ChangePhotoModal from "@/components/InsertEditImage"; 
import AppColors from "@/constants/AppColors";
import { getCategories, matchCategoryFromAi } from "@/constants/category";
import { DescribeItem } from "@/constants/geminiAI";
import { setReportDraft, getReportDraft } from "@/constants/reportDraft";
import { validateReportPage1 } from "@/utils/lostReport";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { Dropdown } from "react-native-element-dropdown";

function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

export default function Report() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [itemName, setItemName] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [contents, setContents] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  const categoryDropdownData = categories.map((cat) => ({
    label: cat.category_name,
    value: String(cat.category_id),
  }));

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // ── RESET FIELDS IF NO ACTIVE DRAFT EXISTS ──
  useEffect(() => {
    const currentDraft = getReportDraft();
    if (!currentDraft) {
      setSelectedImage(null);
      setSelectedCategoryId("");
      setItemName("");
      setDetailedDescription("");
      setContents("");
      setErrors({});
    }
  }, [getReportDraft()]); // Listens directly to shifts in your state cache

  const analyzeImage = async (uri) => {
    setIsLoading(true);
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
        setDetailedDescription(aiResult.detailedDescription || "");
        setContents(aiResult.contents || "");

        const matched = matchCategoryFromAi(aiResult.category, categoryList);
        if (matched) {
          setSelectedCategoryId(String(matched.category_id));
        }
      }
    } catch (error) {
      console.error("AI Analysis Failed:", error);
      Alert.alert(
        "AI Error",
        "Failed to auto-fill details. Please fill them out manually.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    setModalVisible(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "You need to allow camera access to take photos.");
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
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "You need to allow library access to select files.");
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

  const handleNext = () => {
    const validation = validateReportPage1({
      categoryId: selectedCategoryId,
      itemName,
      description: detailedDescription,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      Alert.alert(
        "Missing information",
        "Please fix the highlighted fields before continuing.",
      );
      return;
    }

    setErrors({});
    setReportDraft({
      imageUri: selectedImage,
      categoryId: selectedCategoryId,
      itemName: itemName.trim(),
      description: detailedDescription.trim(),
      contents: contents.trim(),
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
      <ChangePhotoModal
        visible={modalVisible}
        hasPhoto={!!selectedImage}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
        onRemovePhoto={handleRemovePhoto}
        onClose={() => setModalVisible(false)}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Lost Item Report Form</Text>
        <Text style={styles.subTitle}>Item Description</Text>

        <View style={styles.uploadCardWrapper}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.uploadTarget}
              activeOpacity={0.7}
              onPress={() => setModalVisible(true)}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={[styles.dashedRing, { borderColor: "#CCC" }]}>
                  <ActivityIndicator size="large" color="#900000" />
                </View>
              ) : selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  <View style={styles.changeBadge}>
                    <MaterialIcons name="edit" size={16} color="#FFFFFF" />
                  </View>
                </View>
              ) : (
                <View style={styles.dashedRing}>
                  <View style={styles.solidCircle}>
                    <MaterialIcons name="add" size={32} color="#FFFFFF" />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.titleText}>
              {isLoading ? "Analyzing image..." : "Upload Item Photo (Optional)"}
            </Text>
            <Text style={styles.subText}>
              *FoundNest AI will help auto-fill details based on your photo.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Category</Text>

        <Dropdown
          style={[styles.categoryDropdown, errors.category && styles.inputErrorBorder]}
          placeholderStyle={styles.categoryPlaceholder}
          selectedTextStyle={styles.categorySelectedText}
          containerStyle={styles.categoryDropdownContainer}
          data={categoryDropdownData}
          maxHeight={280}
          labelField="label"
          valueField="value"
          placeholder={categoryDropdownData.length === 0 ? "Loading categories..." : "Select Category"}
          disable={categoryDropdownData.length === 0}
          value={selectedCategoryId || null}
          onChange={(item) => {
            setSelectedCategoryId(item.value);
            if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
          }}
          renderItem={renderDropdownItem}
          dropdownPosition="bottom"
          autoScroll={false}
          renderRightIcon={() => (
            <MaterialIcons name="keyboard-arrow-down" size={24} color={AppColors.background} />
          )}
        />
        <FieldError message={errors.category} />

        <Text style={styles.sectionTitle}>Item Name</Text>
        <TextInput
          style={[styles.picker, errors.itemName && styles.inputErrorBorder]}
          placeholder="e.g., iPhone 13 Pro Max, Bag, Umbrella"
          placeholderTextColor="#8C7A70"
          value={itemName}
          onChangeText={(text) => {
            setItemName(text);
            if (errors.itemName) setErrors((prev) => ({ ...prev, itemName: undefined }));
          }}
        />
        <FieldError message={errors.itemName} />

        <Text style={styles.sectionTitle}>Detailed Description</Text>
        <TextInput
          style={[styles.picker, styles.multilineInput, errors.description && styles.inputErrorBorder]}
          maxHeight={140}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          placeholder="Brand, Model, Size, Color, Material, etc."
          placeholderTextColor="#8C7A70"
          value={detailedDescription}
          onChangeText={(text) => {
            setDetailedDescription(text);
            if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
          }}
        />
        <FieldError message={errors.description} />

        <Text style={styles.sectionTitle}>Contents (if applicable)</Text>
        <TextInput
          style={styles.picker}
          placeholder="e.g., wallet contents, keys, notes..."
          placeholderTextColor="#8C7A70"
          value={contents}
          onChangeText={setContents}
        />

        <View style={styles.nextSection}>
          <Text style={styles.pageIndicator}>Page 1 out of 2</Text>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#FFF1E0", paddingBottom: 40 },
  title: { backgroundColor: AppColors.background, fontSize: 22, fontWeight: "700", color: AppColors.surface, padding: 20 },
  subTitle: { borderBottomWidth: 1, borderColor: "#000000", fontSize: 17, fontWeight: "900", color: AppColors.textOnLight, padding: 20, paddingLeft: 10, paddingBottom: 15, marginHorizontal: 10, marginBottom: 20 },
  uploadCardWrapper: { alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingBottom: 10 },
  card: { backgroundColor: AppColors.surface, borderRadius: 28, paddingVertical: 20, paddingHorizontal: 20, alignItems: "center", width: "100%", maxWidth: 450, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  uploadTarget: { marginBottom: 20, justifyContent: "center", alignItems: "center" },
  dashedRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: "#900000", borderStyle: "dashed", justifyContent: "center", alignItems: "center" },
  solidCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#900000", justifyContent: "center", alignItems: "center" },
  titleText: { fontSize: 17, fontWeight: "600", color: "#6B5A52", textAlign: "center", marginBottom: 14 },
  subText: { fontSize: 13, color: "#8C7A70", textAlign: "center", lineHeight: 22, paddingHorizontal: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: AppColors.textOnLight, paddingLeft: 20, marginTop: 20, marginBottom: 8 },
  categoryDropdown: { marginHorizontal: 20, backgroundColor: AppColors.surface, borderRadius: 8, paddingHorizontal: 12, height: 50, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  categoryPlaceholder: { fontSize: 16, color: "#8C7A70" },
  categorySelectedText: { fontSize: 16, color: AppColors.textOnLight },
  categoryDropdownContainer: { backgroundColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  categoryItemRow: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 0.5, borderColor: "#ECECEC" },
  categoryItemText: { fontSize: 16, color: AppColors.textOnLight },
  picker: { marginHorizontal: 20, backgroundColor: AppColors.surface, borderRadius: 8, paddingHorizontal: 12, height: 50, justifyContent: "center", fontSize: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)" },
  multilineInput: { height: 140, paddingTop: 12 },
  inputErrorBorder: { borderWidth: 1, borderColor: "#C62828" },
  fieldError: { color: "#C62828", fontSize: 13, marginHorizontal: 20, marginTop: 4 },
  screenContainer: { flex: 1, backgroundColor: "#FFF1E0" },
  imagePreviewContainer: { width: 110, height: 110, position: "relative" },
  previewImage: { width: "100%", height: "100%", borderRadius: 20 },
  changeBadge: { position: "absolute", bottom: -4, right: -4, backgroundColor: "#900000", width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  nextSection: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, marginTop: 20, paddingVertical: 30, borderTopWidth: 1, borderColor: "rgba(0, 0, 0, 0.24)", alignItems: "center" },
  pageIndicator: { fontWeight: "bold" },
  nextButton: { padding: 10, paddingHorizontal: 30, backgroundColor: AppColors.background, borderRadius: 10 },
  buttonText: { color: AppColors.surface },
});