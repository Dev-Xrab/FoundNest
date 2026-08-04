import AppColors from '@/constants/AppColors';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import {
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ReadOnlyField({ label, value, multiline = false }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, multiline && styles.multilineBox]}>
        <Text style={styles.fieldValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function QrItemView() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { item: itemParam, fromScan } = useLocalSearchParams();
  const item = JSON.parse(itemParam || '{}');
  const isFromScan = fromScan === 'true';

  useFocusEffect(
    useCallback(() => {
      if (!itemParam || !item?.qr_code_id) {
        router.replace('/(tabs)/qrItemList');
      }
    }, [itemParam])
  );

  let qrData = {};
  try {
    qrData = JSON.parse(item.qr_data || '{}');
  } catch {
    qrData = {};
  }

  const handleBack = () => {
    if (isFromScan) {
      router.navigate('/(tabs)/qrItemScan');
    } else {
      router.navigate('/(tabs)/qrItemList');
    }
  };

  const handleBackRef = useRef(() => {});
  useEffect(() => {
    handleBackRef.current = handleBack;
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
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (bypassRef.current) return;
      e.preventDefault();
      bypassRef.current = true;
      handleBackRef.current();
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (bypassRef.current) return false;
        bypassRef.current = true;
        handleBackRef.current();
        return true;
      });
      return () => subscription.remove();
    }, [])
  );

  return (
    <View style={styles.screen}>
      {/* RED HEADER */}
      <View style={[styles.redHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {item.item_name}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* OWNER INFO */}
        <ReadOnlyField label="Owner Name"          value={qrData.ownerName} />
        <ReadOnlyField label="Student Number"      value={qrData.studentNumber} />
        <ReadOnlyField label="Course and Section"  value={qrData.courseSection} />
        <ReadOnlyField label="Contact Number"      value={qrData.contactNumber} />

        {/* ITEM DESCRIPTION */}
        <Text style={styles.sectionHeading}>Item Description</Text>

        {/* IMAGE */}
        <View style={styles.imageWrapper}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.itemImage} />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name="image-outline" size={40} color="#B0A09A" />
              <Text style={styles.imageFallbackText}>No photo available</Text>
            </View>
          )}
        </View>

        {/* CATEGORY */}
        <ReadOnlyField label="Category"            value={item.category_name} />

        {/* ITEM NAME */}
        <ReadOnlyField label="Item Name"           value={item.item_name} />

        {/* DESCRIPTION */}
        <ReadOnlyField
          label="Detailed Description"
          value={item.description}
          multiline
        />

        {/* CONTENTS */}
        <ReadOnlyField
          label="Contents (if applicable)"
          value={item.contents}
        />

        {/* VIEW QR — lets the owner pull up the QR code and download it */}
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.viewQrButton}
          onPress={() =>
            router.navigate({
              pathname: '/(tabs)/qrItemSuccess',
              params: {
                qr_data: item.qr_data ?? '',
                itemName: item.item_name,
                mode: 'view',
                item: itemParam,
                fromScan,
              },
            })
          }
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.viewQrText}>View QR</Text>
        </TouchableOpacity>

        {/* SCAN ANOTHER — only shown when navigated from the scanner */}
        {isFromScan && (
          <TouchableOpacity
            style={[styles.scanAnotherButton, { marginTop: 12 }]}
            onPress={() => router.navigate('/(tabs)/qrItemScan')}
            activeOpacity={0.8}
          >
            <Text style={styles.scanAnotherText}>Scan Another Item</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
    flex: 1,
  },
  container: {
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
  fieldBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D6D6D6',
  },
  multilineBox: {
    height: 'auto',
    minHeight: 80,
    paddingVertical: 12,
  },
  fieldValue: {
    fontSize: 16,
    color: AppColors.textOnLight,
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
  imageWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D6D6D6',
  },
  itemImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  imageFallback: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imageFallbackText: {
    fontSize: 14,
    color: '#B0A09A',
  },

  // ── Scan another ──────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.10)',
    marginBottom: 24,
  },
  scanAnotherButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAnotherText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewQrButton: {
    flexDirection: 'row',
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewQrText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});