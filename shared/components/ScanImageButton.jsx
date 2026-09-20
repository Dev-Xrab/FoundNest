import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

// Triggers AI analysis of the attached photo. Callers pass `disabled` when
// there is no photo (or the form is busy/offline).
export default function ScanImageButton({ onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Ionicons name="sparkles-outline" size={22} color="#FFFFFF" />
      <Text style={styles.text}>Scan Image</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#900000',
    borderRadius: 10,
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
    opacity: 0.7,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
