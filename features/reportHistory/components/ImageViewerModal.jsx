import { Image, Modal, StyleSheet, TouchableOpacity } from "react-native";

/** Fullscreen tap-to-dismiss image viewer, shared by the edit wizard and the match-comparison screen. */
export default function ImageViewerModal({ uri, visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Image
          source={{ uri }}
          style={styles.modalImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "90%",
    height: "80%",
  },
});
