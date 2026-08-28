import { API_BASE_URL } from "@/constants/api";
import AppColors from "@/constants/AppColors";
import { fetchWithAuth } from "@/constants/authApi";
import { getUserNotifications } from "@/constants/notifications";
import { goBack } from "@/constants/previousPage";
import { getToken } from "@/constants/StudentData";
import { setupAndSavePushToken } from "@/utils/pushNotifications";
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
  const [markingAll, setMarkingAll] = useState(false);
  const [numberOfUnreadNotifications, setNumberOfUnreadNotifications] = useState(0);

  const getNotifications = async () => {
    try {
      const data = await getUserNotifications();
      setNumberOfUnreadNotifications(data.filter((n) => !n.is_read).length);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ask for notification permission and save push token when user opens this page
    setupAndSavePushToken();
    getNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      const token = await getToken();
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Optimistically update item locally
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setNumberOfUnreadNotifications((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const token = await getToken();
      const unreadItems = notifications.filter((n) => !n.is_read);

      // Execute all mark-as-read requests in parallel
      await Promise.all(
        unreadItems.map((n) =>
          fetchWithAuth(
            `${API_BASE_URL}/api/notifications/${n.notification_id}/read`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );

      
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      getNotifications(); // Refresh on failure
    } finally {
      setMarkingAll(false);
    }
  };

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
            onPress={() => goBack(router)}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Latest</Text>

          {/* Interactive Mark All as Read Button */}
          {numberOfUnreadNotifications > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              disabled={markingAll}
              activeOpacity={0.7}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color="#900014" />
              ) : (
                <Text style={styles.markAsReadText}>Mark All as Read</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

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
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  markAsReadText: {
    color: "#900014",
    fontWeight: "600",
    fontSize: 14,
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