import AppColors from '@/constants/AppColors';
import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChangePhotoModal({
  visible,
  hasPhoto,
  onTakePhoto,
  onChooseFromLibrary,
  onRemovePhoto,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Change Profile Picture</Text>

          <TouchableOpacity style={styles.option} onPress={onTakePhoto} activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={22} color={AppColors.textOnLight} />
            <Text style={styles.optionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={onChooseFromLibrary} activeOpacity={0.7}>
            <Ionicons name="image-outline" size={22} color={AppColors.textOnLight} />
            <Text style={styles.optionText}>Choose from Library</Text>
          </TouchableOpacity>

          {hasPhoto && (
            <TouchableOpacity style={styles.option} onPress={onRemovePhoto} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={22} color="#C0392B" />
              <Text style={[styles.optionText, { color: '#C0392B' }]}>Remove Current Photo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.textOnLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 16,
    color: AppColors.textOnLight,
  },
  cancelButton: {
    marginTop: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textOnLight,
  },
});