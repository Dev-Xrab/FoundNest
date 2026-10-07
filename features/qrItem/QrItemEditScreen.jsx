import ConfirmDiscardModal from '@/components/ConfirmDiscardModal';
import { showToast } from '@/components/GlobalToast';
import { API_BASE_URL } from '@/constants/api';
import AppColors from '@/constants/AppColors';
import { fetchWithAuth, uploadWithAuth } from '@/constants/authApi';
import { getCategories, matchCategoryFromAi } from '@/constants/category';
import { DescribeItem, getAiErrorMessage } from '@/constants/geminiAI';
import { setIsAnalyzing as setGlobalAnalyzing } from '@/constants/lostReports';
import { getQrItemDetail, validateQrItemForm } from '@/constants/qrItems';
import ImageModal from '@/shared/components/ImageViewerModal';
import PhotoPickerModal from '@/shared/components/PhotoPickerModal';
import ScanImageButton from '@/shared/components/ScanImageButton';
import WebCameraModal from '@/shared/components/WebCameraModal';
import { useAlertModal } from '@/shared/hooks/useAlertModal';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { appendImageField } from '@/shared/utils/formDataImage';
import { guessImageMimeType } from '@/shared/utils/imageMime';
import { buildPermissionAlertConfig } from '@/shared/utils/permissions';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FieldError, ReadOnlyField, RequiredLabel } from './components/QrItemFormFields';

export default function QrItemEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { item: itemParam, editSession } = useLocalSearchParams();

  // Stable parse of the param — qr_code_id / qr_data don't change while on
  // this screen so it's safe to read once for handleSave.
  const item = JSON.parse(itemParam || '{}');

  // ── State ──────────────────────────────────────────────────────────────────

  const [itemName, setItemName]                     = useState(item.item_name || '');
  const [description, setDescription]               = useState(item.description || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    item.category_id ? String(item.category_id) : ''
  );
  const [contents, setContents]                     = useState(item.contents || '');
  const [selectedImage, setSelectedImage]           = useState(null);
  const [imageRemoved, setImageRemoved]             = useState(false);
  const [categories, setCategories]                 = useState([]);
  const [errors, setErrors]                         = useState({});
  const [isSaving, setIsSaving]                     = useState(false);
  const [isAnalyzing, setIsAnalyzing]               = useState(false);
  const [modalVisible, setModalVisible]             = useState(false);
  const [webCameraVisible, setWebCameraVisible]     = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  const { alertModal, showAlert: showCustomAlert } = useAlertModal();

  // "Base" values mirror what's actually saved on the server so hasChanges and
  // the discard reset are always accurate.
  const [baseItemName, setBaseItemName]       = useState(item.item_name || '');
  const [baseDescription, setBaseDescription] = useState(item.description || '');
  const [baseCategoryId, setBaseCategoryId]   = useState(item.category_id ? String(item.category_id) : '');
  const [baseContents, setBaseContents]       = useState(item.contents || '');
  const [baseImageUrl, setBaseImageUrl]       = useState(item.image_url || null);

  // ── Categories ─────────────────────────────────────────────────────────────

  const categoryDropdownData = categories.map((cat) => ({
    label: cat.category_name,
    value: String(cat.category_id),
  }));

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Reset form whenever a different item is opened (or the same item is
  // re-opened via a new editSession timestamp).
  useEffect(() => {
    const currentItem = JSON.parse(itemParam || '{}');

    setItemName(currentItem.item_name || '');
    setDescription(currentItem.description || '');
    setSelectedCategoryId(
      currentItem.category_id ? String(currentItem.category_id) : ''
    );
    setContents(currentItem.contents || '');
    setSelectedImage(null);
    setImageRemoved(false);
    setErrors({});
  }, [itemParam, editSession]);

  // ── Focus effect: re-fetch latest data from server on every focus ──────────
  // editSession in the dependency array ensures this re-runs even when the
  // same item is re-opened (same itemParam, new timestamp).
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchLatest = async () => {
        const currentItem = JSON.parse(itemParam || '{}');
        if (!currentItem.qr_code_id) return;

        try {
          const fresh = await getQrItemDetail(currentItem.qr_code_id);
          if (!fresh || !isActive) return;

          setBaseItemName(fresh.item_name || '');
          setBaseDescription(fresh.description || '');
          setBaseCategoryId(fresh.category_id ? String(fresh.category_id) : '');
          setBaseContents(fresh.contents || '');
          setBaseImageUrl(fresh.image_url || null);

          setItemName(fresh.item_name || '');
          setDescription(fresh.description || '');
          setSelectedCategoryId(fresh.category_id ? String(fresh.category_id) : '');
          setContents(fresh.contents || '');
          setSelectedImage(null);
          setImageRemoved(false);
          setErrors({});
        } catch (err) {
          console.error('fetchLatest error:', err);
        }
      };

      fetchLatest();

      return () => {
        isActive = false;
      };
    }, [itemParam, editSession])
  );

  // ── Dirty check ────────────────────────────────────────────────────────────

  const hasChanges =
    itemName !== baseItemName ||
    description !== baseDescription ||
    selectedCategoryId !== baseCategoryId ||
    contents !== baseContents ||
    selectedImage !== null ||
    imageRemoved;

  const hasSaveableChanges =
    itemName.trim() !== baseItemName.trim() ||
    description.trim() !== baseDescription.trim() ||
    selectedCategoryId !== baseCategoryId ||
    contents.trim() !== baseContents.trim() ||
    selectedImage !== null ||
    imageRemoved;

  // ── Validation ─────────────────────────────────────────────────────────────

  const displayImage = selectedImage || (imageRemoved ? null : baseImageUrl) || null;

  const validate = () => {
    const errs = validateQrItemForm({
      categoryId: selectedCategoryId,
      itemName,
      description,
    });
    if (!displayImage) errs.image = 'Item photo is required.';
    return errs;
  };

  const isFormComplete = Object.keys(validate()).length === 0;
  const isSaveDisabled = isSaving || isAnalyzing || !isFormComplete || !hasSaveableChanges;

  // ── Image picker ───────────────────────────────────────────────────────────

  const handleTakePhoto = async () => {
    setModalVisible(false);

    // expo-image-picker's web "camera" is just a hidden file input with a
    // `capture` hint — desktop browsers ignore that and show a plain file
    // picker, no live preview. WebCameraModal gives web a real camera view.
    if (Platform.OS === 'web') {
      setWebCameraVisible(true);
      return;
    }

    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      showCustomAlert(buildPermissionAlertConfig('Allow camera access to take photos.'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setImageRemoved(false);
    }
  };

  const handleWebCameraCapture = (dataUri) => {
    setWebCameraVisible(false);
    setSelectedImage(dataUri);
    setImageRemoved(false);
  };

  const handleChooseFromLibrary = async () => {
    setModalVisible(false);
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      showCustomAlert(buildPermissionAlertConfig('Allow library access to select files.'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setImageRemoved(false);
    }
  };

  const handleRemovePhoto = () => {
    setModalVisible(false);
    setSelectedImage(null);
    setImageRemoved(true);
  };

  const analyzeImage = async (uri) => {
    setIsAnalyzing(true);
    setGlobalAnalyzing(true);
    try {
      let categoryList = categories;
      if (categoryList.length === 0) {
        categoryList = await getCategories();
        setCategories(categoryList);
      }

      const aiResult = await DescribeItem({ imageUri: uri });

      if (aiResult) {
        setItemName(aiResult.itemName || '');
        setDescription(aiResult.detailedDescription || '');
        setContents(aiResult.contents || '');

        const matched = matchCategoryFromAi(aiResult.category, categoryList);
        if (matched) setSelectedCategoryId(String(matched.category_id));
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
      showCustomAlert({
        message: getAiErrorMessage(err, 'Failed to auto-fill details. Please fill them in manually.'),
      });
    } finally {
      setIsAnalyzing(false);
      setGlobalAnalyzing(false);
    }
  };

  // ── Cancel / discard ───────────────────────────────────────────────────────

  const {
    discardVisible,
    requestLeave: handleCancel,
    confirmDiscard: handleDiscard,
    dismissDiscard,
  } = useUnsavedChangesGuard(hasChanges, () => {
    if (hasChanges) {
      showToast('Edit has been cancelled.', 'info');
    }
    router.replace('/(tabs)/qrItemList');
  });

  // ── Save ───────────────────────────────────────────────────────────────────

  const executeSave = async () => {
    setErrors({});
    setIsSaving(true);

    try {
      if (selectedImage) {
        const formData = new FormData();
        formData.append('item_name', itemName.trim());
        formData.append('description', description.trim());
        formData.append('category_id', selectedCategoryId);
        formData.append('contents', contents.trim());

        const { fileName, mimeType } = guessImageMimeType(selectedImage);

        await appendImageField(
          formData,
          'image',
          selectedImage,
          fileName.includes('.') ? fileName : `${fileName}.jpg`,
          mimeType,
        );

        // uploadWithAuth handles token expiry + silent refresh automatically
        // Do NOT use fetchWithAuth here — it forces Content-Type: application/json
        // which breaks multipart/form-data boundary
        const res = await uploadWithAuth(
          `${API_BASE_URL}/api/qr-items/${item.qr_code_id}`,
          formData,
          'PUT'
        );
        const data = await res.json();
        if (!res.ok) {
          showCustomAlert({ message: data.message || 'Failed to save changes.' });
          return;
        }
      } else {
        const res = await fetchWithAuth(
          `${API_BASE_URL}/api/qr-items/${item.qr_code_id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              item_name: itemName.trim(),
              description: description.trim(),
              category_id: selectedCategoryId ? Number(selectedCategoryId) : null,
              contents: contents.trim(),
              remove_image: imageRemoved,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          showCustomAlert({ message: data.message || 'Failed to save changes.' });
          return;
        }
      }

      let freshQrData = item.qr_data;

      if (item.qr_code_id) {
        const updatedItem = await getQrItemDetail(item.qr_code_id);
        if (updatedItem?.qr_data) {
          freshQrData = updatedItem.qr_data;
        }
      }

      router.replace({
        pathname: '/(tabs)/qrItemSuccess',
        params: {
          qr_data: freshQrData,
          itemName: itemName.trim(),
          mode: 'edit',
        },
      });
    } catch (err) {
      console.error('Update QR item error:', err);
      showToast('Could not connect to server.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (!hasSaveableChanges) return;
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showCustomAlert({ message: 'Please fix the highlighted fields.' });
      return;
    }

    showCustomAlert({
      message: 'Are you sure you want to save these changes?',
      cancelLabel: 'Review',
      confirmLabel: 'Save',
      onConfirm: executeSave,
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <PhotoPickerModal
        visible={modalVisible}
        hasPhoto={!!displayImage}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
        onRemovePhoto={handleRemovePhoto}
        onClose={() => setModalVisible(false)}
      />

      <WebCameraModal
        visible={webCameraVisible}
        onClose={() => setWebCameraVisible(false)}
        onCapture={handleWebCameraCapture}
      />

      <ImageModal
        uri={displayImage}
        visible={imageViewerVisible}
        onClose={() => setImageViewerVisible(false)}
      />

      <ConfirmDiscardModal
        visible={discardVisible}
        onKeepEditing={dismissDiscard}
        onDiscard={handleDiscard}
      />

      {alertModal}

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
          <Text style={styles.headerTitle}>Edit Registered Item</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
      >
        {/* OWNER INFO — read only, comes from the user_profiles join now,
            not from qr_data (qr_data is just an opaque scan key) */}
        <ReadOnlyField label="Owner Name"         value={item.owner_name} />
        <ReadOnlyField label="Student Number"     value={item.student_number} />
        <ReadOnlyField label="Course and Section" value={item.course_section} />
        <ReadOnlyField label="Contact Number"     value={item.contact_number} />

        {/* ITEM DESCRIPTION */}
        <Text style={styles.sectionHeading}>Item Description</Text>

        {/* IMAGE UPLOAD CARD */}
        <View style={styles.uploadCardWrapper}>
          <View style={styles.uploadCard}>
            <TouchableOpacity
              style={styles.uploadTarget}
              activeOpacity={0.7}
              onPress={() =>
                displayImage ? setImageViewerVisible(true) : setModalVisible(true)
              }
              disabled={isAnalyzing || isSaving}
            >
              {isAnalyzing ? (
                <View style={[styles.dashedRing, { borderColor: '#CCC' }]}>
                  <ActivityIndicator size="large" color="#900000" />
                </View>
              ) : displayImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: displayImage }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.changeBadge}
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="edit" size={16} color="#FFFFFF" />
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
              {isAnalyzing ? 'Analyzing Image' : 'Upload Item Photo (Required)'}
            </Text>
            <Text style={styles.uploadSub}>
              *FoundNest AI will help auto-fill details based on your photo.
            </Text>

            <ScanImageButton
              onPress={() => analyzeImage(selectedImage)}
              disabled={!selectedImage || isAnalyzing || isSaving}
            />
          </View>
        </View>

        {/* CATEGORY */}
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
                ? 'Loading categories...'
                : 'Select Category'
            }
            disable={categoryDropdownData.length === 0}
            value={selectedCategoryId || null}
            onChange={(cat) => {
              setSelectedCategoryId(cat.value);
              if (errors.category) setErrors((p) => ({ ...p, category: undefined }));
            }}
            renderRightIcon={() => (
              <MaterialIcons name="keyboard-arrow-down" size={24} color={AppColors.background} />
            )}
          />
          <FieldError message={errors.category} />
        </View>

        {/* ITEM NAME */}
        <View style={styles.fieldGroup}>
          <RequiredLabel label="Item Name" />
          <TextInput
            style={[styles.inputBox, errors.itemName && styles.inputError]}
            value={itemName}
            onChangeText={(t) => {
              setItemName(t);
              if (errors.itemName) setErrors((p) => ({ ...p, itemName: undefined }));
            }}
            placeholder="e.g., iPhone 13 Pro Max, Bag, Umbrella"
            placeholderTextColor="#8C7A70"
          />
          <FieldError message={errors.itemName} />
        </View>

        {/* DESCRIPTION */}
        <View style={styles.fieldGroup}>
          <RequiredLabel label="Detailed Description" />
          <TextInput
            style={[
              styles.inputBox,
              styles.multilineInput,
              errors.description && styles.inputError,
            ]}
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
            }}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholder="Brand, Model, Size, Color, Material, etc."
            placeholderTextColor="#8C7A70"
          />
          <FieldError message={errors.description} />
        </View>

        {/* CONTENTS */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Contents (if applicable)</Text>
          <TextInput
            style={styles.inputBox}
            value={contents}
            onChangeText={setContents}
            placeholder="e.g., Cash amount, ID name"
            placeholderTextColor="#8C7A70"
          />
        </View>

        {/* BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaveDisabled}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.textOnLight,
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    color: AppColors.textOnLight,
    borderWidth: 1,
    borderColor: '#D6D6D6',
  },
  multilineInput: {
    height: 120,
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#C62828',
    borderWidth: 1.5,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: AppColors.textOnLight,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingBottom: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#D6D6D6',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#8C7A70',
  },
  dropdownSelected: {
    fontSize: 16,
    color: AppColors.textOnLight,
  },
  dropdownContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  dropdownItem: {
    fontSize: 16,
    color: AppColors.textOnLight,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    paddingTop: 24,
  },
  cancelButton: {
    height: 46,
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AppColors.background,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: AppColors.background,
  },
  saveButton: {
    height: 46,
    paddingHorizontal: 26,
    backgroundColor: AppColors.background,
    borderRadius: 14,
    minWidth: 100,
    justifyContent: "center",
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#A0A0A0',
    opacity: 0.7,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  uploadCardWrapper: { 
    alignItems: 'center', 
    marginBottom: 16 
  },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadTarget: { 
    marginBottom: 14, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  dashedRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#900000',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  solidCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#900000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: { 
    width: 110, 
    height: 110, 
    position: 'relative' 
  },
  previewImage: { width: '100%', 
    height: '100%', 
    borderRadius: 16 
  },
  changeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#900000',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5A52',
    textAlign: 'center',
    marginBottom: 8,
  },
  uploadSub: { 
    fontSize: 13, 
    color: '#8C7A70', 
    textAlign: 'center', 
    lineHeight: 20 
  },
});