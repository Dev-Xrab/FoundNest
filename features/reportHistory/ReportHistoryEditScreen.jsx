import ConfirmDiscardModal from '@/components/ConfirmDiscardModal';
import { showToast } from '@/components/GlobalToast';
import PhotoPickerModal from '@/shared/components/PhotoPickerModal';
import AppColors from '@/constants/AppColors';
import { getCategories, matchCategoryFromAi } from '@/constants/category';
import { DescribeItem } from '@/constants/geminiAI';
import { getLostReportDetail, setIsAnalyzing } from '@/constants/lostReports';
import { clearReportDraft, getReportDraft, getReportDraftFor, setReportDraft } from '@/constants/reportDraft';
import { formatReportId } from '@/shared/utils/reportFormatters';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { validateReportPage1 } from '@/utils/lostReport';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

import ImageModal from './components/ImageViewerModal';

function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

export default function ReportHistoryEditScreen() {
  const router = useRouter();
  const { report: reportParam, editSession, fromBack, viewOnly } = useLocalSearchParams();
  const report = reportParam ? JSON.parse(reportParam) : {};
  const isViewOnly = viewOnly === 'true';

  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState(report.lost_item_image ?? null); 
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    report.category_id ? String(report.category_id) : ''
  );
  const [itemName, setItemName] = useState(report.item_name ?? '');
  const [detailedDescription, setDetailedDescription] = useState(report.description ?? '');
  const [contents, setContents] = useState(report.contents ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const scrollRef = useRef(null);

  const categoryDropdownData = categories.map((cat) => ({
    label: cat.category_name,
    value: String(cat.category_id),
  }));

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const isFirstFocus = useRef(true);

  useEffect(() => {
    isFirstFocus.current = true;
  }, [editSession]);

  useFocusEffect(
    useCallback(() => {
      // Only the Page 1 ↔ Page 2 round trip (fromBack) should keep the
      // scroll position where the user left it — any other arrival (a
      // fresh tap from profileReportHistory, a different report) should
      // start at the top rather than carry over a stale offset from
      // whichever report was viewed here last.
      if (fromBack !== 'true') {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }

      if (isViewOnly) {
        const applyReportData = (data) => {
          setSelectedImage(null);
          setIsImageRemoved(false);
          setExistingImageUrl(data.lost_item_image ?? null);
          setSelectedCategoryId(data.category_id ? String(data.category_id) : '');
          setItemName(data.item_name ?? '');
          setDetailedDescription(data.description ?? '');
          setContents(data.contents ?? '');
          setErrors({});
        };

        const fresh = reportParam ? JSON.parse(reportParam) : {};
        applyReportData(fresh);

        // Silently refresh with live server data so edits made
        // elsewhere aren't shown as a stale snapshot forever
        const reportId = fresh.lost_report_id;
        if (reportId) {
          (async () => {
            try {
              const data = await getLostReportDetail(reportId);
              if (!data) return; // keep showing cached data, fail silently
              applyReportData({
                ...data,
                lost_item_image: data.image_url,
              });
            } catch (err) {
              console.warn('Background report refresh failed:', err.message);
            }
          })();
        }

        return;
      }

      if (isFirstFocus.current) {
        isFirstFocus.current = false;

        if (fromBack === 'true') {
          const saved = getReportDraft();
          if (saved) {
            setSelectedCategoryId(saved.categoryId ?? '');
            setItemName(saved.itemName ?? '');
            setDetailedDescription(saved.description ?? '');
            setContents(saved.contents ?? '');
            setSelectedImage(saved.imageUri ?? null);
            setIsImageRemoved(saved.isImageRemoved ?? false);
            setExistingImageUrl(saved.existingImageUrl ?? (report.lost_item_image ?? null));
          }
          return;
        }

        const fresh = reportParam ? JSON.parse(reportParam) : {};
        setSelectedImage(null);
        setIsImageRemoved(false);
        setExistingImageUrl(fresh.lost_item_image ?? null);
        setSelectedCategoryId(fresh.category_id ? String(fresh.category_id) : '');
        setItemName(fresh.item_name ?? '');
        setDetailedDescription(fresh.description ?? '');
        setContents(fresh.contents ?? '');
        setErrors({});
      }
    }, [reportParam, editSession, fromBack, isViewOnly])
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
        categoryOptions: categoryList.map((c) => c.category_name),
      });

      if (aiResult) {
        setItemName(aiResult.itemName || '');
        setDetailedDescription(aiResult.detailedDescription || '');
        setContents(aiResult.contents || '');

        const matched = matchCategoryFromAi(aiResult.category, categoryList);
        if (matched) {
          setSelectedCategoryId(String(matched.category_id));
        }
      }
    } catch (error) {
      console.error('AI Analysis Failed:', error);
      Alert.alert('AI Error', 'Failed to auto-fill details. Please fill them out manually.');
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  const handleTakePhoto = async () => {
    setPhotoModalVisible(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'You need to allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      setIsImageRemoved(false); 
      analyzeImage(uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    setPhotoModalVisible(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'You need to allow library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      setIsImageRemoved(false); 
      analyzeImage(uri);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoModalVisible(false);
    setSelectedImage(null);
    setIsImageRemoved(true); 
  };

  const handleNext = () => {
    if (isViewOnly) {
      router.push({
        pathname: '/(tabs)/profileReportHistoryEditNext',
        params: {
          report: reportParam,
          viewOnly: 'true',
        },
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
      Alert.alert('Missing information', 'Please fix the highlighted fields before continuing.');
      return;
    }

    // Only reuse a previously-saved draft if it belongs to THIS report.
    // Otherwise a draft left behind by editing a different report (e.g. via
    // the swipe-back gesture, which skips our cleanup) would leak its
    // location/date into this session.
    const existingDraft = getReportDraftFor(report.lost_report_id);

    setErrors({});
    const nextDraft = {
      reportId:         report.lost_report_id,
      reportParam:      reportParam,
      editSession:      editSession,
      imageUri:         isImageRemoved ? null : selectedImage,
      isImageRemoved:   isImageRemoved, 
      existingImageUrl: isImageRemoved ? null : (selectedImage ? null : existingImageUrl),
      categoryId:       selectedCategoryId,
      itemName:         itemName.trim(),
      description:      detailedDescription.trim(),
      contents:         contents.trim(),
      locationLost:     existingDraft?.locationLost ?? report.location_lost ?? '',
      lostDate:         existingDraft?.lostDate ?? report.actual_lost_date ?? report.lost_date ?? null,
    };
    setReportDraft(nextDraft);

    router.push({
      pathname: '/(tabs)/profileReportHistoryEditNext',
      params: {
        report: reportParam,
        editSession: editSession,
      },
    });
  };

  const displayImage = isImageRemoved ? null : (selectedImage ?? existingImageUrl ?? null);

  // Normalizes a lost-date value to epoch-ms truncated to the minute, so
  // second/millisecond noise (which the app doesn't let users edit anyway)
  // never causes a false "unsaved changes" positive.
  const parseDateToMinuteMs = (value) => {
    if (!value) return null;
    const cleaned = String(value)
      .replace(/\+\d{2}(:\d{2})?$/, '')
      .replace(/\+00$/, '')
      .replace('T', ' ')
      .trim();
    const d = new Date(cleaned.replace(' ', 'T'));
    if (isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 60000) * 60000;
  };

  // True value comparison against the original report — only flags "dirty"
  // if something actually differs, on this page or (via the draft) page 2.
  const isSessionDirty = () => {
    const originalCategoryId = report.category_id ? String(report.category_id) : '';
    const originalItemName = (report.item_name ?? '').trim();
    const originalDescription = (report.description ?? '').trim();
    const originalContents = (report.contents ?? '').trim();
    const originalPhoto = report.lost_item_image ?? null;

    if (selectedCategoryId !== originalCategoryId) return true;
    if (itemName.trim() !== originalItemName) return true;
    if (detailedDescription.trim() !== originalDescription) return true;
    if (contents.trim() !== originalContents) return true;

    const currentPhoto = isImageRemoved ? null : (selectedImage ?? existingImageUrl ?? null);
    if (currentPhoto !== originalPhoto) return true;

    // Location/date only matter if page 2 was already visited this session —
    // otherwise the draft simply mirrors the untouched original. Scoped to
    // this report so a leftover draft from a different report never counts.
    const existingDraft = getReportDraftFor(report.lost_report_id);

    const originalLocationLost = report.location_lost ?? '';
    const currentLocationLost = existingDraft?.locationLost ?? originalLocationLost;
    if (currentLocationLost !== originalLocationLost) return true;

    const originalLostDateMs = parseDateToMinuteMs(report.actual_lost_date ?? report.lost_date);
    const currentLostDateMs = existingDraft?.lostDate
      ? parseDateToMinuteMs(existingDraft.lostDate)
      : originalLostDateMs;
    if (currentLostDateMs !== originalLostDateMs) return true;

    return false;
  };

  const hasChanges = !isViewOnly && isSessionDirty();

  const {
    discardVisible: discardModalVisible,
    requestLeave: handleCancelPress,
    confirmDiscard: handleDiscardConfirm,
    dismissDiscard,
  } = useUnsavedChangesGuard(hasChanges, () => {
    if (isViewOnly) {
      router.navigate('/(tabs)/profileReportHistory');
      return;
    }

    clearReportDraft();
    if (isSessionDirty()) {
      showToast('Edit has been cancelled.', 'info');
    }
    router.navigate('/(tabs)/profileReportHistory');
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screenContainer}
    >
      <ConfirmDiscardModal
        visible={discardModalVisible}
        onKeepEditing={dismissDiscard}
        onDiscard={handleDiscardConfirm}
      />

      <PhotoPickerModal
        visible={photoModalVisible}
        hasPhoto={!!displayImage}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
        onRemovePhoto={handleRemovePhoto}
        onClose={() => setPhotoModalVisible(false)}
      />

      <ImageModal
        uri={displayImage}
        visible={imageViewerVisible}
        onClose={() => setImageViewerVisible(false)}
      />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
        {isViewOnly ? (
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={handleCancelPress} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={AppColors.surface} />
            </TouchableOpacity>
            <Text style={styles.titleInRow}>Report Details</Text>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={handleCancelPress} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={AppColors.surface} />
            </TouchableOpacity>
            <Text style={styles.titleInRow}>Edit Lost Item Report</Text>
          </View>
        )}
        <Text style={styles.subTitle}>Item Description</Text>

        <View style={styles.uploadCardWrapper}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.uploadTarget}
              activeOpacity={0.7}
              onPress={() => {
                if (isViewOnly) {
                  if (displayImage) setImageViewerVisible(true);
                  return;
                }
                setPhotoModalVisible(true);
              }}
              disabled={isLoading || (isViewOnly && !displayImage)}
            >
              {isLoading ? (
                <View style={[styles.dashedRing, { borderColor: '#CCC' }]}>
                  <ActivityIndicator size="large" color="#900000" />
                </View>
              ) : displayImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: displayImage }} style={styles.previewImage} />
                  {isViewOnly ? (
                    <View style={styles.expandIcon}>
                      <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.changeBadge}>
                      <MaterialIcons name="edit" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              ) : isViewOnly ? (
                <View style={[styles.dashedRing, styles.dashedRingViewOnly]}>
                  <MaterialIcons name="image-not-supported" size={28} color="#B0A09A" />
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
              {isLoading
                ? 'Analyzing image...'
                : isViewOnly
                ? (displayImage ? 'Item Photo' : 'No Photo Attached')
                : 'Upload Item Photo (Optional)'}
            </Text>
            {!isViewOnly && (
              <Text style={styles.subText}>
                *FoundNest AI will help auto-fill details based on your photo.
              </Text>
            )}
          </View>
        </View>

        {isViewOnly && (
          <>
            <Text style={styles.sectionTitle}>Report ID</Text>
            <Text style={[styles.picker, { lineHeight: 50 }]}>
              {formatReportId(report.lost_report_id)}
            </Text>
          </>
        )}

        <Text style={styles.sectionTitle}>Category</Text>
        <Dropdown
          style={[styles.categoryDropdown, errors.category && styles.inputErrorBorder]}
          placeholderStyle={styles.categoryPlaceholder}
          selectedTextStyle={styles.categorySelectedText}
          containerStyle={styles.categoryDropdownContainer}
          itemTextStyle={styles.categoryItemText}
          activeColor="rgba(139, 0, 0, 0.1)"
          data={categoryDropdownData}
          maxHeight={280}
          labelField="label"
          valueField="value"
          placeholder={categoryDropdownData.length === 0 ? 'Loading categories...' : 'Select a category...'}
          disable={categoryDropdownData.length === 0 || isViewOnly}
          value={selectedCategoryId || null}
          onChange={(item) => {
            setSelectedCategoryId(item.value);
            if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
          }}
          renderRightIcon={() =>
            isViewOnly ? null : (
              <MaterialIcons name="keyboard-arrow-down" size={24} color={AppColors.background} />
            )
          }
        />
        <FieldError message={errors.category} />

        <Text style={styles.sectionTitle}>Item Name</Text>
        <TextInput
          style={[styles.picker, errors.itemName && styles.inputErrorBorder]}
          placeholder="e.g., iPhone 13 Pro Max, Bag, Umbrella"
          placeholderTextColor="#8C7A70"
          value={itemName}
          editable={!isViewOnly}
          onChangeText={(text) => {
            setItemName(text);
            if (errors.itemName) setErrors((prev) => ({ ...prev, itemName: undefined }));
          }}
        />
        <FieldError message={errors.itemName} />

        <Text style={styles.sectionTitle}>Detailed Description</Text>
        <TextInput
          style={[styles.picker, styles.multilineInput, errors.description && styles.inputErrorBorder]}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          placeholder="Brand, Model, Size, Color, Material, etc."
          placeholderTextColor="#8C7A70"
          value={detailedDescription}
          editable={!isViewOnly}
          onChangeText={(text) => {
            setDetailedDescription(text);
            if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
          }}
        />
        <FieldError message={errors.description} />

        <Text style={styles.sectionTitle}>Contents (if applicable)</Text>
        <TextInput
          style={[styles.picker]}
          placeholder="e.g., wallet contents, keys, notes..."
          placeholderTextColor="#8C7A70"
          value={contents}
          editable={!isViewOnly}
          onChangeText={setContents}
        />

        <View style={styles.nextSection}>
          <Text style={styles.pageIndicator}>Page 1 out of 2</Text>
          <View style={styles.buttonSection}>
            {!isViewOnly && (
              <TouchableOpacity
                style={styles.outlinedButton}
                onPress={handleCancelPress}
              >
                <Text style={styles.outlinedButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#FFF1E0' },
  container: { flexGrow: 1, backgroundColor: '#FFF1E0', paddingBottom: 40 },
  titleRow: { backgroundColor: AppColors.background, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  backButton: { marginRight: 10, padding: 2 },
  titleInRow: { flex: 1, fontSize: 22, fontWeight: '700', color: AppColors.surface },
  title: { backgroundColor: AppColors.background, fontSize: 22, fontWeight: '700', color: AppColors.surface, padding: 20 },
  subTitle: { borderBottomWidth: 1, borderColor: '#000000', fontSize: 17, fontWeight: '900', color: AppColors.textOnLight, padding: 20, paddingLeft: 10, paddingBottom: 15, marginHorizontal: 10, marginBottom: 20 },
  uploadCardWrapper: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  card: { backgroundColor: AppColors.surface, borderRadius: 28, paddingVertical: 20, paddingHorizontal: 20, alignItems: 'center', width: '100%', maxWidth: 450, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  uploadTarget: { marginBottom: 20, justifyContent: 'center', alignItems: 'center' },
  dashedRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: '#900000', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  dashedRingViewOnly: { borderColor: '#CCCCCC' },
  solidCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#900000', justifyContent: 'center', alignItems: 'center' },
  titleText: { fontSize: 17, fontWeight: '600', color: '#6B5A52', textAlign: 'center', marginBottom: 14 },
  subText: { fontSize: 13, color: '#8C7A70', textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: AppColors.textOnLight, paddingLeft: 20, marginTop: 20, marginBottom: 8 },
  categoryDropdown: { marginHorizontal: 20, backgroundColor: AppColors.surface, borderRadius: 8, paddingHorizontal: 12, height: 50 },
  categoryPlaceholder: { fontSize: 16, color: '#8C7A70' },
  categorySelectedText: { fontSize: 16, color: AppColors.textOnLight },
  categoryDropdownContainer: { marginHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  categoryItemText: { fontSize: 16, color: AppColors.textOnLight },
  picker: { marginHorizontal: 20, backgroundColor: AppColors.surface, borderRadius: 8, paddingHorizontal: 12, height: 50, fontSize: 16 },
  multilineInput: { height: 140, paddingTop: 12 },
  inputErrorBorder: { borderWidth: 1, borderColor: '#C62828' },
  fieldError: { color: '#C62828', fontSize: 13, marginHorizontal: 20, marginTop: 4 },
  imagePreviewContainer: { width: 110, height: 110, position: 'relative' },
  previewImage: { width: '100%', height: '100%', borderRadius: 20 },
  changeBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#900000', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  expandIcon: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: 4 },
  nextSection: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 20, paddingVertical: 30, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.24)', alignItems: 'center' },
  pageIndicator: { fontWeight: 'bold' },
  buttonSection: { flexDirection: 'row', gap: 8 },
  outlinedButton: { padding: 10, paddingHorizontal: 30, borderRadius: 10, borderWidth: 1.5, borderColor: AppColors.background },
  outlinedButtonText: { color: AppColors.background },
  nextButton: { padding: 10, paddingHorizontal: 30, backgroundColor: AppColors.background, borderRadius: 10 },
  buttonText: { color: AppColors.surface },
});