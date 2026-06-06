import AppColors from "@/constants/AppColors";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ItemDetails = () => {
  const insets = useSafeAreaInsets();
  const { itemString } = useLocalSearchParams();
  const item = itemString ? JSON.parse(itemString) : null;

  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.loaderContainer}>
          <Text style={{ color: "#666" }}>Loading item details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push("/find")}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Item Details</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.imageWrapper}
          activeOpacity={0.9}
          onPress={() => setImageModalVisible(true)}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.mainImage} />
          <View style={styles.expandIcon}>
            <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={styles.detailsCard}>
          <Text style={styles.itemTitle}>{item.title}</Text>

          <View style={styles.divider} />

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.value}>{item.category}</Text>
          </View>

          {item.description ? (
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Description</Text>
              <Text
                style={[styles.value, { fontWeight: "400", lineHeight: 20 }]}
              >
                {item.description}
              </Text>
            </View>
          ) : null}

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Location Found</Text>
            <Text style={styles.value}>{item.location}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Date & Time Found</Text>
            <Text style={styles.value}>{item.date}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Current Location</Text>
            <Text style={styles.value}>{item.currentLocation}</Text>
          </View>

          <View style={styles.divider} />

          {/* Trigger the Modal to open */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setClaimModalVisible(true)}
          >
            <Text style={styles.primaryButtonText}>How to claim?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View Office Location</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* How to Claim Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={claimModalVisible}
        onRequestClose={() => setClaimModalVisible(false)}
      >
        {/* Pressing the dark background will close the modal */}
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setClaimModalVisible(false)}
        >
          {/* Prevent touches inside the white card from closing the modal */}
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.dragHandle} />
              <Text style={styles.modalTitle}>How to Claim?</Text>

              <Text style={styles.stepTitle}>Step 1: Bring Proof</Text>
              <Text style={styles.stepDescription}>
                Please bring your BulSU Student ID/COR/or any form of
                identification and be ready to provide proof of ownership (e.g.,
                describing a unique detail on an item, showing a photo of you
                while holding the item, or unlocking the item for devices).
              </Text>

              <Text style={styles.stepTitle}>Step 2: Visit the Office</Text>
              <Text style={styles.stepDescription}>
                Proceed to the FoundNest Office listed on the item details.
              </Text>

              <Text style={styles.stepTitle}>Step 3: Final Photo</Text>
              <Text style={styles.stepDescription}>
                Our staff will take a quick photo of the turnover for our
                security records and to finalize the process.
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={imageModalVisible}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={[styles.imageModalClose, { top: insets.top + 12 }]}
            onPress={() => setImageModalVisible(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageModalContent}
            activeOpacity={1}
            onPress={() => setImageModalVisible(false)}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF5F0",
  },
  header: {
    backgroundColor: AppColors.background,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
  },
  backButton: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.surface,
    marginLeft: 4,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  imageWrapper: {
    width: "100%",
    height: 300,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#ccc",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  expandIcon: {
    position: "absolute",
    bottom: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 20,
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  itemTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#A31D1D",
  },
  divider: {
    height: 1,
    backgroundColor: "#EBEBEB",
    marginBottom: 15,
  },
  infoBlock: {
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    color: "#555",
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  primaryButton: {
    backgroundColor: "#A31D1D",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#A31D1D",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#A31D1D",
    fontWeight: "bold",
    fontSize: 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* --- Modal Styles --- */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 80, // Extra padding at the bottom for navigation bar clearance
    width: "100%",
  },
  dragHandle: {
    width: 50,
    height: 5,
    backgroundColor: "#EBEBEB",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
    textAlign: "center",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginTop: 15,
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },

  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  imageModalClose: {
    position: "absolute",
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
});

export default ItemDetails;
