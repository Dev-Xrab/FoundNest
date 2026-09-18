import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Live camera capture for web.
 *
 * expo-image-picker's "Take Photo" on web is just a hidden
 * `<input type=file capture>` click — on mobile browsers that opens the
 * OS camera app, but on desktop the `capture` attribute is ignored and it
 * falls back to a plain file picker, with no live preview at all. This
 * gives web the same "point camera, tap shutter" experience as the native
 * app, using expo-camera's CameraView (which, unlike image-picker, really
 * does use getUserMedia on web).
 *
 * onCapture receives a data: URI (base64) — that's what CameraView returns
 * for `uri` on web, since browsers have no file:// paths to hand back.
 */
export default function WebCameraModal({ visible, onClose, onCapture }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  // Browsers never re-show their own permission popup once a site has been
  // denied camera access — a repeat click on "Grant Permission" then just
  // silently resolves "denied" again with no visible feedback at all.
  // expo-camera's web shim can't distinguish "never asked" from
  // "permanently blocked" (it always reports canAskAgain: true), so the
  // only way to tell here is: we asked, and it's still not granted.
  const [hasRequested, setHasRequested] = useState(false);
  const cameraRef = useRef(null);

  const handleRequestPermission = async () => {
    await requestPermission();
    setHasRequested(true);
  };

  const handleShutter = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      // "image/jpg" isn't a real MIME type (browsers tolerate it for local
      // <Image> previews, but a backend validating the upload's MIME type
      // against a real whitelist won't) — "image/jpeg" is the correct one.
      const dataUri = photo.uri.startsWith('data:')
        ? photo.uri
        : `data:image/jpeg;base64,${photo.uri}`;
      onCapture(dataUri);
    } catch (err) {
      console.error('Web camera capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : !permission.granted ? (
          <View style={styles.centered}>
            <Ionicons name="camera-outline" size={56} color="#FFFFFF" />
            <Text style={styles.permissionText}>
              FoundNest needs camera access to take a photo.
            </Text>
            {hasRequested ? (
              <Text style={styles.permissionText}>
                Camera access is blocked for this site. Enable it from your browser's site
                settings (usually the padlock icon in the address bar), then reload the page.
              </Text>
            ) : (
              <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />

            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.shutterRow}>
              <TouchableOpacity
                style={styles.shutterButton}
                onPress={handleShutter}
                disabled={isCapturing}
                activeOpacity={0.8}
              >
                {isCapturing ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#900000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelLink: {
    padding: 8,
  },
  cancelLinkText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
  },
});
