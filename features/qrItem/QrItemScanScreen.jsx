import AppColors from '@/constants/AppColors';
import { resolveQrScan } from '@/constants/qrItems';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Scan result states ────────────────────────────────────────────────────────
// 'scanning'   — camera is live, waiting for a QR code
// 'loading'    — QR was read, API call in progress
// 'not_found'  — qr_data doesn't exist in the DB at all
// 'not_owner'  — exists but belongs to someone else

export default function QrItemScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState('scanning');
  const [errorMessage, setErrorMessage] = useState('');
  const isProcessing = useRef(false);

  // Every time the screen comes into focus (including coming back from qrItemView),
  // fully reset scan state so the camera is ready for a new scan immediately.
  useFocusEffect(
    useCallback(() => {
      setScanState('scanning');
      setErrorMessage('');
      isProcessing.current = false;
    }, [])
  );

  // Also reset the processing lock whenever scanState returns to 'scanning'
  useEffect(() => {
    if (scanState === 'scanning') {
      isProcessing.current = false;
    }
  }, [scanState]);

  const handleBarCodeScanned = async ({ data }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setScanState('loading');

    try {
      const result = await resolveQrScan(data);

      if (!result.ok) {
        setErrorMessage(result.message || 'Something went wrong. Please try again.');
        setScanState('not_found');
        return;
      }

      if (!result.found) {
        setErrorMessage('This QR code is not registered in FoundNest.');
        setScanState('not_found');
        return;
      }

      if (!result.isOwner) {
        setScanState('not_owner');
        return;
      }

      // Owner confirmed — go to item detail view
      router.navigate({
        pathname: '/(tabs)/qrItemView',
        params: { item: JSON.stringify(result.item), fromScan: 'true' },
      });
    } catch (err) {
      console.error('Scan error:', err);
      setErrorMessage('Could not connect to server. Please try again.');
      setScanState('not_found');
    }
  };

  const handleScanAgain = () => {
    setErrorMessage('');
    setScanState('scanning');
  };

  // ── Permission not yet determined ─────────────────────────────────────────
  if (!permission) {
    return (
      <View style={[styles.centeredScreen, { paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={AppColors.background} />
      </View>
    );
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.centeredScreen, { paddingBottom: insets.bottom }]}>
        <View style={[styles.redHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.navigate('/(tabs)/qrItem')}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan An Item</Text>
          </View>
        </View>

        <View style={styles.permissionBody}>
          <Ionicons name="camera-outline" size={56} color={AppColors.background} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSub}>
            FoundNest needs your camera to scan QR codes.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (scanState === 'loading') {
    return (
      <View style={styles.fullScreen}>
        <View style={[styles.redHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.navigate('/(tabs)/qrItem')}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan An Item</Text>
          </View>
        </View>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Checking item…</Text>
        </View>
      </View>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (scanState === 'not_found') {
    return (
      <View style={[styles.centeredScreen, { paddingBottom: insets.bottom }]}>
        <View style={[styles.redHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.navigate('/(tabs)/qrItem')}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan An Item</Text>
          </View>
        </View>

        <View style={styles.resultBody}>
          <View style={styles.resultIconCircle}>
            <Ionicons name="close" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.resultTitle}>QR Code Not Found</Text>
          <Text style={styles.resultSub}>
            {errorMessage || 'This QR code is not registered in FoundNest.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleScanAgain}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Scan Another Item</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.navigate('/(tabs)/qrItem')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Back to QR Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Not the owner ─────────────────────────────────────────────────────────
  if (scanState === 'not_owner') {
    return (
      <View style={[styles.centeredScreen, { paddingBottom: insets.bottom }]}>
        <View style={[styles.redHeader, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.navigate('/(tabs)/qrItem')}
              activeOpacity={0.7}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan An Item</Text>
          </View>
        </View>

        <View style={styles.resultBody}>
          <View style={[styles.resultIconCircle, styles.lockedIconCircle]}>
            <Ionicons name="lock-closed" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.resultTitle}>Item Not Yours</Text>
          <Text style={styles.resultSub}>
            This item is registered under a different account. Details are private for security reasons.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleScanAgain}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Scan Another Item</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.navigate('/(tabs)/qrItem')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Back to QR Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Camera / scanning view ────────────────────────────────────────────────
  return (
    <View style={styles.fullScreen}>
      <View style={[styles.redHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/qrItem')}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan An Item</Text>
        </View>
      </View>

      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.scanHint}>Point your camera at a FoundNest QR code</Text>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;
const VIEWFINDER_SIZE = 240;

const styles = StyleSheet.create({
  // fullScreen: black background — used for camera and loading states only
  fullScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  // centeredScreen: cream background — used for all result/permission states
  centeredScreen: {
    flex: 1,
    backgroundColor: '#FFF1E0',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  redHeader: {
    backgroundColor: AppColors.background,
    paddingHorizontal: 16,
    zIndex: 10,
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

  // ── Camera overlay ────────────────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    top: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  scanHint: {
    marginTop: 28,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // ── Result screens (not_found / not_owner / permission) ───────────────────
  resultBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 12,
  },
  resultIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockedIconCircle: {
    backgroundColor: '#5C5C5C',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.textOnLight,
    textAlign: 'center',
  },
  resultSub: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D48B8B',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textOnLight,
  },

  // ── Permission screen ─────────────────────────────────────────────────────
  permissionBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.textOnLight,
    textAlign: 'center',
  },
  permissionSub: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
});