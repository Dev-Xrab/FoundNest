import AppColors from "@/constants/AppColors";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ConfirmDiscardModal({
  visible,
  onKeepEditing,
  onDiscard,
  message = "Discard changes? Unsaved edits will be lost.",
  cancelLabel = "Keep Editing",
  confirmLabel = "Discard",
}) {
  // Determine which buttons should be shown
  const showCancel = Boolean(cancelLabel);
  const showConfirm = Boolean(confirmLabel);

  // Single button mode if only one label exists
  const isSingleButton = !showCancel || !showConfirm;

  // Handle the single button press
  const handleSinglePress = () => {
    if (showConfirm) {
      onDiscard?.();
    } else {
      onKeepEditing?.();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        if (onKeepEditing) {
          onKeepEditing();
        } else {
          onDiscard?.();
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalMessage}>{message}</Text>

          <View style={styles.modalDivider} />

          <View style={styles.modalActions}>
            {isSingleButton ? (
              <TouchableOpacity
                style={styles.singleBtn}
                onPress={handleSinglePress}
                activeOpacity={0.7}
              >
                <Text style={styles.singleBtnText}>
                  {confirmLabel || cancelLabel}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.modalKeepBtn}
                  onPress={onKeepEditing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalKeepText}>{cancelLabel}</Text>
                </TouchableOpacity>

                <View style={styles.modalActionsDivider} />

                <TouchableOpacity
                  style={styles.modalDiscardBtn}
                  onPress={onDiscard}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalDiscardText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  modalBox: {
    width: "78%",
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },

  modalMessage: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textOnLight,
    textAlign: "left",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    lineHeight: 22,
  },

  modalDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  modalActions: {
    flexDirection: "row",
    height: 50,
  },

  // Single button
  singleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.background,
  },

  singleBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.surface,
  },

  // Cancel button
  modalKeepBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0EEEE",
  },

  modalKeepText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textOnLight,
  },

  // Divider between buttons
  modalActionsDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },

  // Confirm button
  modalDiscardBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.background,
  },

  modalDiscardText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.surface,
  },
});