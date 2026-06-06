import { fetchWithAuth } from "@/constants/authApi";
import { getUser } from "@/constants/StudentData";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getNotifications = async () => {
      try {
        const user = await getUser();
        const userId = user ? user.user_id : null;
        console.log("Fetching notifications for user ID:", userId);

        const response = await fetchWithAuth(
          `https://foundnest-backend.onrender.com/api/notifications/user/${userId}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched notifications data:", data);
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    getNotifications();
  }, []);

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

  const renderNotification = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        {/* Using a search/magnify icon to match the design */}
        <MaterialCommunityIcons name="magnify" size={28} color="#900014" />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title || "Match Found!"}</Text>
          <View style={styles.rightHeader}>
            <Text style={styles.timeText}>{getTimeAgo(item.created_at)}</Text>
            {/* The gold dot for unread status. */}
            {item.is_read && <View style={styles.unreadDot} />}
          </View>
        </View>

        <Text style={styles.cardMessage} numberOfLines={1}>
          A potential match for your {item.lost_item_name || "item"}...
        </Text>
      </View>
    </View>
  );

  // --- NEW: Empty State Component ---
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
      {/* Red Header Bar */}

      {/* Main Content Area */}
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
            ListEmptyComponent={renderEmptyState} // --- NEW: Attach empty state ---
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
    backgroundColor: "#A0001A",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
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
  // --- NEW: Empty State Styles ---
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
