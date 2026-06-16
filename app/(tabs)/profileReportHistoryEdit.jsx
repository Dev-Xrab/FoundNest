import ConfirmDiscardModal from '@/components/ConfirmDiscardModal';
import AppColors from '@/constants/AppColors';
import { getCategories, matchCategoryFromAi } from '@/constants/category';
import { DescribeItem } from '@/constants/geminiAI';
import { clearReportDraft, getReportDraft, setReportDraft } from '@/constants/reportDraft';
import { validateReportPage1 } from '@/utils/lostReport';
import { MaterialIcons } from '@expo/vector-icons';
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

function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

export default function ProfileReportHistoryEdit() {
  const router = useRouter();
  const { report: reportParam, editSession, fromBack, viewOnly } = useLocalSearchParams();
  const report = reportParam ? JSON.parse(reportParam) : {};
  const isViewOnly = viewOnly === 'true';

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    report.category_id ? String(report.category_id) : ''
  );
  const [itemName, setItemName] = useState(report.item_name ?? '');
  const [detailedDescription, setDetailedDescription] = useState(report.description ?? '');
  const [contents, setContents] = useState(report.contents ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [discardModalVisible, setDiscardModalVisible] = useState(false);

  const categoryDropdownData = categories.map((cat) => ({
    label: cat.category_name,
    value: String(cat.category_id),
  }));

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const isFirstFocus = useRef(true);

  // Reset the flag whenever a new edit session starts (new item opened)
  useEffect(() => {
    isFirstFocus.current = true;
  }, [editSession]);

  useFocusEffect(
    useCallback(() => {
      // View-only mode never touches the draft — always reflect the report param
      if (isViewOnly) {
        const fresh = reportParam ? JSON.parse(reportParam) : {};
        setSelectedImage(null);
        setSelectedCategoryId(fresh.category_id ? String(fresh.category_id) : '');
        setItemName(fresh.item_name ?? '');
        setDetailedDescription(fresh.description ?? '');
        setContents(fresh.contents ?? '');
        setErrors({});
        return;
      }

      if (isFirstFocus.current) {
        isFirstFocus.current = false;

        if (fromBack === 'true') {
          // Arriving here via Back button from page 2 — restore from draft
          const saved = getReportDraft();
          if (saved) {
            setSelectedCategoryId(saved.categoryId ?? '');
            setItemName(saved.itemName ?? '');
            setDetailedDescription(saved.description ?? '');
            setContents(saved.contents ?? '');
            // selectedImage is a local URI kept in draft only; don't restore it
            // to state but it will be re-included when Next is pressed again
          }
          return;
        }

        // Fresh open from the list — seed fields from report param
        const fresh = reportParam ? JSON.parse(reportParam) : {};
        setSelectedImage(null);
        setSelectedCategoryId(fresh.category_id ? String(fresh.category_id) : '');
        setItemName(fresh.item_name ?? '');
        setDetailedDescription(fresh.description ?? '');
        setContents(fresh.contents ?? '');
        setErrors({});
        return;
      }

      // Subsequent focuses (e.g. coming back after cancel modal) — restore from draft
      if (fromBack === 'true') {
        const saved = getReportDraft();
        if (saved) {
          setSelectedCategoryId(saved.categoryId ?? '');
          setItemName(saved.itemName ?? '');
          setDetailedDescription(saved.description ?? '');
          setContents(saved.contents ?? '');
        }
      }
    }, [reportParam, editSession, fromBack, isViewOnly])
  );

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
        categoryOptions: categoryList.map((c) => c.name),
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
      Alert.alert(
        'AI Error',
        'Failed to auto-fill details. Please fill them out manually.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePickOptions = () => {
    Alert.alert('Upload Item Photo', 'Choose a source for your photo:', [
      {
        text: 'Use Camera',
        onPress: async () => {
          const { ImagePicker } = await import('expo-image-picker');
          const permissionResult =
            await ImagePicker.requestCameraPermissionsAsync();
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
            analyzeImage(uri);
          }
        },
      },
      {
        text: 'Pick from Gallery',
        onPress: async () => {
          const { ImagePicker } = await import('expo-image-picker');
          const permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
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
            analyzeImage(uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleNext = () => {
    if (isViewOnly) {
      // No validation, no draft — just carry the report + flag to page 2
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

    const existingDraft = getReportDraft();

    setErrors({});
    setReportDraft({
      reportId:         report.lost_report_id,
      reportParam:      reportParam,
      editSession:      editSession,
      imageUri:         selectedImage,
      existingImageUrl: report.lost_item_image ?? null,
      categoryId:       selectedCategoryId,
      itemName:         itemName.trim(),
      description:      detailedDescription.trim(),
      contents:         contents.trim(),
      locationLost:     existingDraft?.locationLost ?? report.location_lost ?? '',
      lostDate:         existingDraft?.lostDate ?? report.actual_lost_date ?? report.lost_date ?? null,
    });

    router.navigate('/(tabs)/profileReportHistoryEditNext');
  };

  // Image to display: newly picked > existing URL > nothing
  const displayImage = selectedImage ?? report.lost_item_image ?? null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screenContainer}
    >
      <ConfirmDiscardModal
        visible={discardModalVisible}
        onKeepEditing={() => setDiscardModalVisible(false)}
        onDiscard={() => {
          setDiscardModalVisible(false);
          clearReportDraft();
          router.navigate({
            pathname: '/(tabs)/profileReportHistory',
            params: { toast: 'editCancelled' },
          });
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {isViewOnly ? (
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/profileReportHistory')} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={AppColors.surface} />
            </TouchableOpacity>
            <Text style={styles.titleInRow}>Report Details</Text>
          </View>
        ) : (
          <Text style={styles.title}>Edit Lost Item Report</Text>
        )}
        <Text style={styles.subTitle}>Item Description</Text>

        {/* ── Image upload ── */}
        <View style={styles.uploadCardWrapper}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.uploadTarget}
              activeOpacity={0.7}
              onPress={handleImagePickOptions}
              disabled={isLoading || isViewOnly}
            >
              {isLoading ? (
                <View style={[styles.dashedRing, { borderColor: '#CCC' }]}>
                  <ActivityIndicator size="large" color="#900000" />
                </View>
              ) : displayImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: displayImage }} style={styles.previewImage} />
                  {!isViewOnly && (
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

        {/* ── Report ID ── */}
        {isViewOnly && (
          <>
            <Text style={styles.sectionTitle}>Report ID</Text>
            <Text style={[styles.picker, { lineHeight: 50 }]}>
              {report.lost_report_id ? `RPT-${String(report.lost_report_id).padStart(5, '0')}` : '—'}
            </Text>
          </>
        )}

        {/* ── Category ── */}
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

        {/* ── Item Name ── */}
        <Text style={styles.sectionTitle}>Item Name</Text>
        <TextInput
          style={[
            styles.picker,
            errors.itemName && styles.inputErrorBorder,
          ]}
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

        {/* ── Description ── */}
        <Text style={styles.sectionTitle}>Detailed Description</Text>
        <TextInput
          style={[
            styles.picker,
            styles.multilineInput,
            errors.description && styles.inputErrorBorder,
          ]}
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

        {/* ── Contents ── */}
        <Text style={styles.sectionTitle}>Contents (if applicable)</Text>
        <TextInput
          style={[styles.picker]}
          placeholder="e.g., wallet contents, keys, notes..."
          placeholderTextColor="#8C7A70"
          value={contents}
          editable={!isViewOnly}
          onChangeText={setContents}
        />

        {/* ── Footer ── */}
        <View style={styles.nextSection}>
            <Text style={styles.pageIndicator}>Page 1 out of 2</Text>
            <View style={styles.buttonSection}>
                {!isViewOnly && (
                  <TouchableOpacity
                      style={styles.outlinedButton}
                      onPress={() => setDiscardModalVisible(true)}
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
    screenContainer: { 
        flex: 1, 
        backgroundColor: '#FFF1E0' 
    },
    container: { 
        flexGrow: 1, 
        backgroundColor: '#FFF1E0', 
        paddingBottom: 40 
    },
    titleRow: {
        backgroundColor: AppColors.background,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    backButton: {
        marginRight: 10,
        padding: 2,
    },
    titleInRow: {
        flex: 1,
        fontSize: 22,
        fontWeight: '700',
        color: AppColors.surface,
    },
    title: {
        backgroundColor: AppColors.background,
        fontSize: 22,
        fontWeight: '700',
        color: AppColors.surface,
        padding: 20,
    },
    subTitle: {
        borderBottomWidth: 1, 
        borderColor: '#000000',
        fontSize: 17, 
        fontWeight: '900',
        color: AppColors.textOnLight,
        padding: 20, 
        paddingLeft: 10, 
        paddingBottom: 15,
        marginHorizontal: 10, 
        marginBottom: 20,
    },
    uploadCardWrapper: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingHorizontal: 20, 
        paddingBottom: 10 
    },
    card: {
        backgroundColor: AppColors.surface, 
        borderRadius: 28,
        paddingVertical: 20, 
        paddingHorizontal: 20,
        alignItems: 'center', 
        width: '100%', 
        maxWidth: 450,
        shadowColor: '#000', 
        shadowOffset: { 
            width: 0, 
            height: 2 
        },
        shadowOpacity: 0.05, 
        shadowRadius: 10, 
        elevation: 2,
    },
    uploadTarget: { 
        marginBottom: 20, 
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
    dashedRingViewOnly: {
        borderColor: '#CCCCCC',
    },
    solidCircle: {
        width: 60, 
        height: 60, 
        borderRadius: 30,
        backgroundColor: '#900000', 
        justifyContent: 'center', 
        alignItems: 'center',
    },
    titleText: { 
        fontSize: 17, 
        fontWeight: '600', 
        color: '#6B5A52', 
        textAlign: 'center', 
        marginBottom: 14 
    },
    subText: { 
        fontSize: 13, 
        color: '#8C7A70', 
        textAlign: 'center', 
        lineHeight: 22, 
        paddingHorizontal: 12 
    },
    sectionTitle: { 
        fontSize: 17, 
        fontWeight: '800', 
        color: AppColors.textOnLight, 
        paddingLeft: 20, 
        marginTop: 20, 
        marginBottom: 8 
    },
    categoryDropdown: { 
        marginHorizontal: 20, 
        backgroundColor: AppColors.surface, 
        borderRadius: 8, 
        paddingHorizontal: 12, 
        height: 50 
    },
    categoryPlaceholder: { 
        fontSize: 16, 
        color: '#8C7A70' 
    },
    categorySelectedText: { 
        fontSize: 16, 
        color: AppColors.textOnLight 
    },
    categoryDropdownContainer: { 
        marginHorizontal: 20, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: 'rgba(0,0,0,0.08)' 
    },
    categoryItemText: { 
        fontSize: 16, 
        color: AppColors.textOnLight 
    },
    picker: { 
        marginHorizontal: 20, 
        backgroundColor: AppColors.surface, 
        borderRadius: 8, 
        paddingHorizontal: 12, 
        height: 50, 
        fontSize: 16 
    },
    multilineInput: { 
        height: 140, 
        paddingTop: 12 
    },
    inputErrorBorder: { 
        borderWidth: 1, 
        borderColor: '#C62828' 
    },
    fieldError: { 
        color: '#C62828', 
        fontSize: 13, 
        marginHorizontal: 20, 
        marginTop: 4 
    },
    imagePreviewContainer: { 
        width: 110, 
        height: 110, 
        position: 'relative' 
    },
    previewImage: { 
        width: '100%', 
        height: '100%', 
        borderRadius: 20 
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
    nextSection: {
        flexDirection: 'row', 
        justifyContent: 'space-between',
        marginHorizontal: 20, 
        marginTop: 20, 
        paddingVertical: 30,
        borderTopWidth: 1, 
        borderColor: 'rgba(0,0,0,0.24)',
        alignItems: 'center',
    },
    pageIndicator: { 
        fontWeight: 'bold' 
    },
    buttonSection: { 
        flexDirection: 'row', 
        gap: 8 
    },
    outlinedButton: {
        padding: 10,
        paddingHorizontal: 30,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: AppColors.background,
    },
    outlinedButtonText: {
        color: AppColors.background,
    },
    nextButton: { 
        padding: 10, 
        paddingHorizontal: 30, 
        backgroundColor: AppColors.background, 
        borderRadius: 10 
    },
    buttonText: { 
        color: AppColors.surface 
    },
});