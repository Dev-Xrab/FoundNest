import { normalizeFoundItem } from "@/constants/foundItems";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import {
  Dimensions,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_HORIZONTAL_PADDING = 20;
const CARD_HEIGHT = 220;
const AUTO_SCROLL_INTERVAL = 3500; // 3.5 seconds

function formatFoundDate(iso) {
  if (!iso) return "N/A";
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  return `${datePart} | ${timePart}`;
}

export default function RecentFindsCarousel({ items, activeIndex, onIndexChange }) {
  const router = useRouter();
  const scrollRef = useRef(null);
  const isInteracting = useRef(false);

  // Pad the array for infinite scroll: [Last Item Clone, ...Original Items, First Item Clone]
  const extendedItems =
    items.length > 1 ? [items[items.length - 1], ...items, items[0]] : items;

  // Initialize offset to index 1 (the first real item)
  useEffect(() => {
    if (items.length > 1) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          x: SCREEN_WIDTH,
          animated: false,
        });
      }, 50);
    }
  }, [items.length]);

  // Handle continuous auto-sliding forward
  useEffect(() => {
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      if (isInteracting.current) return;

      const currentScrollIndex = activeIndex + 1; // map real index to extended index
      const nextScrollIndex = currentScrollIndex + 1;

      scrollRef.current?.scrollTo({
        x: nextScrollIndex * SCREEN_WIDTH,
        animated: true,
      });
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(timer);
  }, [activeIndex, items.length]);

  // Seamless jump reset on boundary reach
  const handleScrollEnd = useCallback(
    (event) => {
      if (items.length <= 1) return;

      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const rawIndex = Math.round(contentOffsetX / SCREEN_WIDTH);

      // Reached the cloned first item at the very end -> jump back to real first item
      if (rawIndex === extendedItems.length - 1) {
        scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
        onIndexChange(0);
      }
      // Reached the cloned last item at the very start -> jump forward to real last item
      else if (rawIndex === 0) {
        scrollRef.current?.scrollTo({
          x: items.length * SCREEN_WIDTH,
          animated: false,
        });
        onIndexChange(items.length - 1);
      } else {
        onIndexChange(rawIndex - 1);
      }
      isInteracting.current = false;
    },
    [extendedItems.length, items.length, onIndexChange],
  );

  if (items.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollBeginDrag={() => {
          isInteracting.current = true;
        }}
        onTouchStart={() => {
          isInteracting.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            isInteracting.current = false;
          }, 500);
        }}
        scrollEnabled={items.length > 1}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {extendedItems.map((item, index) => (
          <View
            key={`slide-${item.found_report_id ?? item.item_id ?? index}-${index}`}
            style={styles.slide}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={{ flex: 1 }}
              onPress={() => {
                const formattedItem = normalizeFoundItem(item, formatFoundDate);

                router.push({
                  pathname: "/FoundItemDetails",
                  params: { itemString: JSON.stringify(formattedItem) },
                });
              }}
            >
              <ImageBackground
                source={{ uri: item.image_url ?? item.imageUrl }}
                style={styles.card}
                imageStyle={styles.cardImage}
              >
                <View style={styles.overlay}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.item_name ?? item.title}
                  </Text>
                  <View style={styles.divider} />
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={16} color="#fff" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {formatFoundDate(item.found_date || item.date)}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={16} color="#fff" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.location_found ?? item.location}
                    </Text>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {items.length > 1 && (
        <>
          <View style={styles.dots}>
            {items.map((report, index) => (
              <View
                key={report.found_report_id ?? report.item_id ?? index}
                style={[
                  styles.dot,
                  index === activeIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.counter}>
            {activeIndex + 1} / {items.length}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: -CARD_HORIZONTAL_PADDING,
    marginBottom: 45,
  },
  scroll: {
    height: CARD_HEIGHT,
  },
  scrollContent: {
    alignItems: "center",
  },
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    height: CARD_HEIGHT,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardImage: {
    borderRadius: 16,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
  },
  dot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    backgroundColor: "#FFF8F0",
    width: 40,
  },
  counter: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
