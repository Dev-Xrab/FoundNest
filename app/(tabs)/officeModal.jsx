import { getUser } from "@/constants/StudentData";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppColors from "@/constants/AppColors";

function OfficeBanner({ office }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageUri =
    typeof office.image === "string" ? office.image.trim() : null;
  const localImage = typeof office.image === "number" ? office.image : null;

  useEffect(() => {
    setImageFailed(false);
    setIsLoading(true);
  }, [office.office_id, imageUri, localImage]);

  const showImage = (localImage != null || Boolean(imageUri)) && !imageFailed;

  return (
    <View style={styles.imageBanner}>
      {showImage ? (
        <>
          <Image
            source={localImage != null ? localImage : { uri: imageUri }}
            style={styles.bannerImage}
            resizeMode="cover"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setImageFailed(true);
              setIsLoading(false);
            }}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator
                size="large"
                color={AppColors.background || "#ffffff"}
              />
            </View>
          )}
        </>
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

      <View style={styles.imageOverlay}>
        <Text style={styles.imageTextHeader}>{office.floor}</Text>
        <Text style={styles.imageTextSub}>Hours: {office.operating_hours}</Text>
      </View>
    </View>
  );
}

export default function OfficeModal({ visible, onClose, office }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep track of whether the user is editing an existing review
  const [existingReviewId, setExistingReviewId] = useState(null);

  const fetchReviewsAndCheckExisting = async () => {
    if (!office || !office.office_id) return;
    setIsLoadingReviews(true);

    try {
      // 1. Get the current user exactly like your old code
      const userId = await getUser();

      // 2. Fetch the reviews
      const res = await fetch(
        `https://foundnest-backend.onrender.com/api/offices/${office.office_id}/reviews`,
      );
      if (!res.ok) throw new Error(`Failed to fetch reviews: ${res.status}`);

      const data = await res.json();
      const fetchedReviews = Array.isArray(data) ? data : data.reviews || [];
      setReviews(fetchedReviews);

      // 3. Look for a review from the current user
      if (userId) {
        const myReview = fetchedReviews.find(
          (r) => r.user_id === userId.user_id || r.email === userId.email,
        );

        if (myReview) {
          // Pre-fill the form if they already left a review!
          setExistingReviewId(myReview.review_id);
          setRating(myReview.rating);
          setReviewText(myReview.review_text || "");
        } else {
          // Clean state if they haven't reviewed yet
          setExistingReviewId(null);
          setRating(0);
          setReviewText("");
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

  const handlePostReview = async () => {
    if (rating === 0) {
      Alert.alert(
        "Rating Required",
        "Please select a star rating before posting.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Using your exact old user fetching method
      const userId = await getUser();
      console.log("Current user for review submission:", userId); // Log the user data for debugging
      const isEditing = existingReviewId !== null;
      const endpoint = isEditing
        ? `https://foundnest-backend.onrender.com/api/offices/${office.office_id}/reviews/${existingReviewId}`
        : `https://foundnest-backend.onrender.com/api/offices/${office.office_id}/reviews`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId.user_id, // Restored exactly as you had it!
          rating: rating,
          review_text: reviewText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit review");
      }

      Alert.alert(
        "Success",
        isEditing
          ? "Your review has been updated!"
          : "Your review has been posted!",
      );

      // Re-fetch to update the list and ensure everything is synced
      fetchReviewsAndCheckExisting();
    } catch (error) {
      console.error("Post review error:", error);
      Alert.alert("Submission Failed", error.message);
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
  const subtitle = office.floor
    ? `Location: ${office.floor}`
    : "FoundNest Office";

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backgroundTap}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {headerTitle}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
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

              <Text style={styles.sectionTitle}>
                {existingReviewId ? "Edit Your Review" : "Rate and Review"}
              </Text>

              <View style={styles.starSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Text
                      style={[
                        styles.starIcon,
                        rating >= star && styles.starSelected,
                      ]}
                    >
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.textInput}
                placeholder="Tell others about your experience at this office."
                multiline
                numberOfLines={4}
                value={reviewText}
                onChangeText={setReviewText}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.postButton,
                  (reviewText.length > 0 || rating > 0) &&
                    styles.postButtonActive,
                ]}
                onPress={handlePostReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={AppColors.surface} />
                ) : (
                  <Text style={styles.postButtonText}>
                    {existingReviewId ? "Update Review" : "Post Review"}
                  </Text>
                )}
              </TouchableOpacity>

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
                          <Text style={styles.reviewerId}>{reviewerName}</Text>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
// Styles remain completely unchanged down below...
// Keep all your exact same styles down here!
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backgroundTap: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: AppColors.surface,
    height: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    elevation: 10,
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
  headerSubtitle: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 4,
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
    paddingBottom: 100,
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
});
