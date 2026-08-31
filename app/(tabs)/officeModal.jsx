import ConfirmDiscardModal from "@/components/ConfirmDiscardModal";
import AppColors from "@/constants/AppColors";
import { isOnline } from "@/constants/offlineDb";
import { getUser } from "@/constants/StudentData";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DISMISS_THRESHOLD = 120;

function OfficeBanner({ office }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageUri =
    typeof office.image_url === "string" ? office.image_url.trim() : null;
  const localImage = typeof office.image === "number" ? office.image : null;

  useEffect(() => {
    setImageFailed(false);
    setIsLoading(true);
  }, [office.office_id, imageUri, localImage]);

  const showImage = (localImage !== null || Boolean(imageUri)) && !imageFailed;

  return (
    <View style={styles.imageBanner}>
      {showImage ? (
        <View style={StyleSheet.absoluteFillObject}>
          <Image
            source={
              localImage !== null
                ? localImage
                : {
                    uri: imageUri,
                    headers: {
                      "User-Agent":
                        "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                    },
                  }
            }
            style={styles.bannerImage}
            resizeMode="cover"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={(e) => {
              console.log("Image load error:", e.nativeEvent.error);
              setImageFailed(true);
              setIsLoading(false);
            }}
          />

          <View style={styles.imageOverlay}>
            <Text style={styles.imageTextHeader}>{office.floor}</Text>
            <Text style={styles.imageTextSub}>
              Hours: {office.operating_hours}
            </Text>
          </View>

          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator
                size="large"
                color={AppColors.background || "#ffffff"}
              />
            </View>
          )}
        </View>
      ) : (
        <View
          style={[
            styles.bannerFallback,
            { backgroundColor: office.color || AppColors.background },
          ]}
        >
          <Text style={styles.bannerFallbackAcronym}>No Image Available</Text>
        </View>
      )}
    </View>
  );
}

export default function OfficeModal({ visible, onClose, office }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  // Store original fetched values to track diffs
  const [initialRating, setInitialRating] = useState(0);
  const [initialReviewText, setInitialReviewText] = useState("");

  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState(null);
  const [online, setOnline] = useState(true);

  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalMessage, setAlertModalMessage] = useState("");

  const scrollViewRef = useRef(null);

  // ── Animated drag-down offset ──
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.8) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    isOnline().then(setOnline);

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setOnline(isConnected);
    });

    return () => unsubscribe();
  }, []);

  const fetchReviewsAndCheckExisting = async () => {
    if (!office || !office.office_id) return;

    const currentlyOnline = await isOnline();
    if (!currentlyOnline) {
      setOnline(false);
      setIsLoadingReviews(false);
      return;
    }

    setIsLoadingReviews(true);

    try {
      const userId = await getUser();
      const res = await fetch(
        `https://foundnest-backend.onrender.com/api/offices/${office.office_id}/reviews`
      );
      if (!res.ok) throw new Error(`Failed to fetch reviews: ${res.status}`);

      const data = await res.json();
      const fetchedReviews = Array.isArray(data) ? data : data.reviews || [];
      setReviews(fetchedReviews);

      if (userId) {
        const myReview = fetchedReviews.find(
          (r) => r.user_id === userId.user_id || r.email === userId.email
        );

        if (myReview) {
          const currentRating = myReview.rating || 0;
          const currentText = myReview.review_text || "";

          setExistingReviewId(myReview.review_id);
          setRating(currentRating);
          setReviewText(currentText);
          setInitialRating(currentRating);
          setInitialReviewText(currentText);
        } else {
          setExistingReviewId(null);
          setRating(0);
          setReviewText("");
          setInitialRating(0);
          setInitialReviewText("");
        }
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
      setReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchReviewsAndCheckExisting();
    }
  }, [office, visible]);

  // Validation logic:
  // - Editing: changes made to rating or text AND rating > 0
  // - New Post: rating > 0
  const isEditing = existingReviewId !== null;
  const isChanged =
    rating !== initialRating || reviewText.trim() !== initialReviewText.trim();
  const canSubmit = isEditing ? isChanged && rating > 0 : rating > 0;

  const handlePostReview = async () => {
    const currentlyOnline = await isOnline();
    if (!currentlyOnline) {
      setOnline(false);
      setAlertModalMessage("You are currently offline. Cannot post review.");
      setAlertModalVisible(true);
      return;
    }

    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const userId = await getUser();
      const endpoint = isEditing
        ? `https://foundnest-backend.onrender.com/api/reviews/${existingReviewId}`
        : `https://foundnest-backend.onrender.com/api/offices/${office.office_id}/reviews`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId.user_id,
          rating: rating,
          review_text: reviewText.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit review");
      }

      const successMsg = isEditing
        ? "Your review has been updated!"
        : "Your review has been posted!";

      setAlertModalMessage(successMsg);
      setAlertModalVisible(true);

      fetchReviewsAndCheckExisting();
    } catch (error) {
      console.error("Post review error:", error);
      setAlertModalMessage(error.message || "Failed to submit review.");
      setAlertModalVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!office) {
    return null;
  }

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? (
          reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        ).toFixed(1)
      : "0.0";

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const headerTitle = office.office_name;

  return (
    <>
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.backgroundTap} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheetContainer,
              { transform: [{ translateY }] },
            ]}
          >
            <View {...panResponder.panHandlers} style={styles.dragHeaderContainer}>
              <View style={styles.dragHandle} />
              <View style={styles.header}>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.headerTitle} numberOfLines={2}>
                    {headerTitle}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <OfficeBanner office={office} />

              <View style={styles.contentPadding}>
                <Text style={styles.description}>{office.description}</Text>

                <View style={styles.divider} />

                <View style={styles.ratingOverview}>
                  <View style={styles.scoreContainer}>
                    <Text style={styles.hugeScore}>{averageRating}</Text>
                    <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
                    <Text style={styles.reviewCount}>({totalReviews})</Text>
                  </View>
                  <View style={styles.barsContainer}>
                    <View style={styles.barRow}>
                      <View style={[styles.bar, { width: "100%" }]} />
                    </View>
                    <View style={styles.barRow}>
                      <View style={[styles.bar, { width: "0%" }]} />
                    </View>
                    <View style={styles.barRow}>
                      <View style={[styles.bar, { width: "0%" }]} />
                    </View>
                    <View style={styles.barRow}>
                      <View style={[styles.bar, { width: "0%" }]} />
                    </View>
                    <View style={styles.barRow}>
                      <View style={[styles.bar, { width: "0%" }]} />
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* ── Rate and review interactive area ── */}
                <View pointerEvents={!online ? "none" : "auto"}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      !online && styles.disabledText,
                    ]}
                  >
                    {isEditing ? "Edit Your Review" : "Rate and Review"}
                  </Text>

                  <View
                    style={[
                      styles.starSelector,
                      !online && styles.disabledStarSelector,
                    ]}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        disabled={isLoadingReviews || !online}
                      >
                        <Text
                          style={[
                            styles.starIcon,
                            rating >= star && styles.starSelected,
                            !online && styles.disabledStarIcon,
                          ]}
                        >
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[
                      styles.textInput,
                      (isLoadingReviews || !online) && styles.disabledInput,
                    ]}
                    placeholder="Tell others about your experience at this office."
                    placeholderTextColor={!online ? "#A0A0A0" : "#999"}
                    multiline
                    numberOfLines={4}
                    value={reviewText}
                    onChangeText={setReviewText}
                    textAlignVertical="top"
                    editable={!isLoadingReviews && online}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 150);
                    }}
                  />

                  <TouchableOpacity
                    style={[
                      styles.postButton,
                      canSubmit && !isLoadingReviews && online && styles.postButtonActive,
                      (!online || !canSubmit) && styles.disabledPostButton,
                    ]}
                    onPress={handlePostReview}
                    disabled={isSubmitting || isLoadingReviews || !online || !canSubmit}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator
                        size="small"
                        color={AppColors.surface}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.postButtonText,
                          !canSubmit && styles.disabledButtonText,
                        ]}
                      >
                        {isEditing ? "Update Review" : "Post Review"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Reviews</Text>

                {isLoadingReviews ? (
                  <ActivityIndicator
                    size="small"
                    color={AppColors.background || "#900000"}
                    style={{ marginTop: 20 }}
                  />
                ) : reviews.length > 0 ? (
                  reviews.map((review) => {
                    const reviewerName = review.first_name
                      ? `${review.first_name} ${review.last_name}`
                      : review.email || "Anonymous";

                    return (
                      <View key={review.review_id} style={styles.reviewItem}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.avatar} />
                          <View style={styles.reviewerInfo}>
                            <Text style={styles.reviewerId}>
                              {reviewerName}
                            </Text>
                            <Text style={styles.smallStars}>
                              {"⭐".repeat(review.rating || 0)}
                            </Text>
                          </View>
                          <Text style={styles.timeAgo}>
                            {formatDate(review.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.reviewBody}>
                          {review.review_text || "No comment provided."}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noReviewsText}>
                    No reviews yet. Be the first to review!
                  </Text>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDiscardModal
        visible={alertModalVisible}
        onKeepEditing={() => setAlertModalVisible(false)}
        onDiscard={() => setAlertModalVisible(false)}
        message={alertModalMessage}
        cancelLabel="OK"
        confirmLabel={null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backgroundTap: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: AppColors.surface,
    height: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    elevation: 10,
  },
  dragHeaderContainer: {
    width: "100%",
    backgroundColor: AppColors.surface,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#DDDDDD",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: AppColors.background,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: AppColors.background,
    fontWeight: "bold",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageBanner: {
    width: "100%",
    height: 180,
    overflow: "hidden",
    backgroundColor: AppColors.separator,
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(200, 200, 200, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  bannerFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerFallbackAcronym: {
    fontSize: 22,
    fontWeight: "800",
    color: AppColors.surface,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 12,
    zIndex: 2,
  },
  imageTextHeader: {
    color: AppColors.surface,
    fontWeight: "bold",
    fontSize: 16,
  },
  imageTextSub: {
    color: AppColors.surface,
    fontWeight: "500",
    fontSize: 14,
    marginTop: 4,
  },
  contentPadding: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.textOnLight,
  },
  ratingOverview: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreContainer: {
    alignItems: "center",
    marginRight: 20,
  },
  hugeScore: {
    fontSize: 48,
    fontWeight: "bold",
  },
  stars: {
    fontSize: 12,
  },
  reviewCount: {
    fontSize: 12,
    color: "#666",
  },
  barsContainer: {
    flex: 1,
    justifyContent: "space-between",
    height: 60,
  },
  barRow: {
    height: 6,
    backgroundColor: "#EEEEEE",
    borderRadius: 3,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: "#FFD700",
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.separator,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  starSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  starIcon: {
    fontSize: 32,
    color: "#CCCCCC",
  },
  starSelected: {
    color: "#FFD700",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 8,
    padding: 12,
    height: 100,
    backgroundColor: "#FAFAFA",
  },
  postButton: {
    backgroundColor: "#A09696",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  postButtonActive: {
    backgroundColor: AppColors.background,
  },
  postButtonText: {
    color: AppColors.surface,
    fontWeight: "bold",
  },
  disabledButtonText: {
    color: "#7A7A7A",
  },
  reviewItem: {
    marginTop: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#A0A0FF",
    marginRight: 10,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerId: {
    fontWeight: "bold",
    fontSize: 14,
  },
  smallStars: {
    fontSize: 10,
  },
  timeAgo: {
    fontSize: 10,
    color: "#888",
  },
  reviewBody: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  noReviewsText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
    fontStyle: "italic",
  },
  disabledText: {
    color: "#888888",
  },
  disabledStarSelector: {
    opacity: 0.5,
  },
  disabledStarIcon: {
    color: "#D0D0D0",
  },
  disabledInput: {
    backgroundColor: "#EFEFEF",
    borderColor: "#E0E0E0",
    color: "#888888",
  },
  disabledPostButton: {
    backgroundColor: "#D6D6D6",
    opacity: 0.7,
  },
});