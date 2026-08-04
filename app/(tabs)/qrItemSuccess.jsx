import FoundNestLogo from '@/assets/images/app-logo.png';
import AppColors from '@/constants/AppColors';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

export default function QrItemSuccess() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { qr_data, itemName, mode, item, fromScan } = useLocalSearchParams();
  const isEditMode = mode === 'edit';
  const isViewMode = mode === 'view';
  const bannerText = isViewMode
    ? 'Your Item QR Code'
    : isEditMode
    ? 'Item Edited Successfully!'
    : 'Item Successfully Registered!';
  const qrRef = useRef(null);
  const viewShotRef = useRef(null);

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow media library access to save the QR code.');
        return;
      }

      const uri = await viewShotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'QR code image saved to your gallery.');
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', 'Failed to save QR code image.');
    }
  };

  const handleBottomButton = () => {
    if (isViewMode) {
      router.navigate({
        pathname: '/(tabs)/qrItemView',
        params: { item, fromScan },
      });
    } else if (isEditMode) {
      router.replace('/(tabs)/qrItemList');
    } else {
      router.replace('/(tabs)/qrItemRegister');
    }
  };

  const handleBottomButtonRef = useRef(() => {});
  useEffect(() => {
    handleBottomButtonRef.current = handleBottomButton;
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
      if (bypassRef.current) return; // already redirecting — let it proceed
      e.preventDefault();
      bypassRef.current = true;
      handleBottomButtonRef.current();
    });
    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (bypassRef.current) return false;
        bypassRef.current = true;
        handleBottomButtonRef.current();
        return true;
      });
      return () => subscription.remove();
    }, [])
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 30 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* SUCCESS BANNER */}
      <View style={styles.successBanner}>
        <View style={styles.checkCircle}>
          <Ionicons
            name={isViewMode ? 'qr-code-outline' : 'checkmark'}
            size={28}
            color={AppColors.background}
          />
        </View>
        <Text style={styles.successText}>{bannerText}</Text>
      </View>

      {/* QR CARD — captured by ViewShot */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1.0 }}
        style={styles.qrCardShot}
      >
        <View style={styles.qrCard}>
          <Text style={styles.itemName}>{itemName}</Text>

          <View style={styles.qrWrapper}>
            <QRCode
              value={qr_data || 'FoundNest'}
              size={200}
              getRef={qrRef}
              backgroundColor="#FFFFFF"
              color="#000000"
            />
          </View>

          {/* FoundNest branding */}
          <View style={styles.brandRow}>
            <Image source={FoundNestLogo} style={styles.brandLogo} resizeMode="contain"/>
            <Text style={styles.brandText}>FoundNest</Text>
          </View>
        </View>
      </ViewShot>

      {/* DOWNLOAD BUTTON */}
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={handleDownload}
        activeOpacity={0.7}
      >
        <View style={styles.downloadIconCircle}>
          <Ionicons
            name="download-outline"
            size={18}
            color={AppColors.background}
          />
        </View>
        <Text style={styles.downloadText}>Download Image For Printing</Text>
      </TouchableOpacity>

      {/* BOTTOM BUTTON */}
      <TouchableOpacity
        style={styles.registerAnotherButton}
        onPress={handleBottomButton}
        activeOpacity={0.7}
      >
        <Text style={styles.registerAnotherText}>
          {isViewMode ? 'Close' : isEditMode ? 'Back to My Items' : 'Register Another Item'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },

  // ── Success banner ────────────────────────────────────────────────────────
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },

  // ── QR card ───────────────────────────────────────────────────────────────
  qrCardShot: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 320,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  itemName: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textOnLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrWrapper: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -10,
  },
  brandLogo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.background,
    marginLeft: -6,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
  },
  downloadIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  registerAnotherButton: {
    marginTop: 28,
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerAnotherText: {
    fontSize: 15,
    fontWeight: '500',
    color: AppColors.background,
  },
});