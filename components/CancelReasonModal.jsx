import AppColors from '@/constants/AppColors';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const REASONS = [
  'I found it myself!',
  "I'm no longer looking for it.",
  'I duplicated a report.',
];

export default function CancelReasonModal({
  visible,
  onKeepIt,
  onConfirmCancel,
}) {
  const [selectedReason, setSelectedReason] = useState(null);

  // Reset selection when modal opens
  useEffect(() => {
    if (visible) setSelectedReason(null);
  }, [visible]);

  const canConfirm = selectedReason !== null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onKeepIt}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Wait! May we know why{'\n'}you are cancelling?</Text>
          <View style={styles.divider} />

          <View style={styles.reasonList}>
            {REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonRow}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, selectedReason === reason && styles.radioSelected]}>
                  {selectedReason === reason && <View style={styles.radioFill} />}
                </View>
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.keepBtn}
              onPress={onKeepIt}
              activeOpacity={0.7}
            >
              <Text style={styles.keepText}>No, keep it</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity
              style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
              onPress={() => canConfirm && onConfirmCancel(selectedReason)}
              activeOpacity={canConfirm ? 0.7 : 1}
            >
              <Text style={[styles.confirmText, !canConfirm && styles.confirmTextDisabled]}>
                Confirm Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: '82%',
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: AppColors.textOnLight,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  reasonList: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#BBBBBB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: AppColors.background,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.background,
  },
  reasonText: {
    fontSize: 14,
    color: AppColors.textOnLight,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    height: 50,
  },
  keepBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EEEE',
  },
  keepText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textOnLight,
  },
  actionDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.background,
  },
  confirmBtnDisabled: {
    backgroundColor: '#C0A0A0',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.surface,
  },
  confirmTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
});