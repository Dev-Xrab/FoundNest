import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import { fetchWithAuth } from "@/constants/authApi";
import { getToken, getUser } from "@/constants/StudentData";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Removed the global [isRead, setIsRead] state because it causes bugs inside lists.
  const [numberOfUnreadNotifications, setNumberOfUnreadNotifications] =
    useState(0);
  const getNotifications = async () => {
    try {
      const user = await getUser();
      const userId = user ? user.user_id : null;

      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/notifications/user/${userId}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNumberOfUnreadNotifications(data.filter((n) => !n.is_read).length);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      console.log("Marking notification as read, ID:", notificationId);

      const token = await getToken();
      console.log("Using token:", token);
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Notification successfully marked as read!");

      // Optimistically update local UI state so the gold dot disappears instantly
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Helper function to format the date
  const getTimeAgo = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    return `${diffDays} days ago`;
  };

  const renderNotification = ({ item }) => {
    // Determine unread status locally for this item from its object property
    const isItemUnread = item.is_read;

    return (
      <TouchableOpacity
        onPress={() => {
          markAsRead(item.notification_id);
          router.push({
            pathname: "/profileReportHistoryView",
            params: {
              match: JSON.stringify(item),
            },
          });
        }}
      >
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="magnify" size={28} color="#900014" />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {item.title || "Match Found!"}
              </Text>
              <View style={styles.rightHeader}>
                <Text style={styles.timeText}>
                  {getTimeAgo(item.created_at)}
                </Text>
                {/* Fixed: Conditional check uses item specific value instead of global state */}
                {!isItemUnread && <View style={styles.unreadDot} />}
              </View>
            </View>

            <Text style={styles.cardMessage} numberOfLines={1}>
              A potential match for your {item.lost_item_name || "item"}...
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        When you get new alerts or matches, they'll show up here.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Latest</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#900014"
            style={styles.loader}
          />
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item, index) =>
              item.notification_id?.toString() || index.toString()
            }
            renderItem={renderNotification}
            contentContainerStyle={
              notifications.length === 0
                ? styles.emptyListContainer
                : styles.listContainer
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF0DE",
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.surface,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  rightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeText: {
    fontSize: 12,
    color: "#666666",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FACC15",
  },
  cardMessage: {
    fontSize: 14,
    color: "#666666",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555555",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
