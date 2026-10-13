import ConfirmDiscardModal from '@/components/ConfirmDiscardModal';
import { showToast } from '@/components/GlobalToast';
import AppColors from '@/constants/AppColors';
import { getCategories } from '@/constants/category';
import { addConnectivityListener } from '@/constants/netInfo';
import { isOnline } from '@/constants/offlineDb';
import { deleteQrItem, getUserQrItems } from '@/constants/qrItems';
import { useAlertModal } from '@/shared/hooks/useAlertModal';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Nest illustration (empty state) ──────────────────────────────────────────
const emptyNestBg = require('@/assets/images/Empty Nest/empty-nest-bg.png');
const emptyNest = require('@/assets/images/Empty Nest/empty-nest.png');
const upperLeft = require('@/assets/images/Empty Nest/upper-left.png');
const upperRight = require('@/assets/images/Empty Nest/upper-right.png');
const upperRightBee = require('@/assets/images/Empty Nest/upper-right-bee.png');

function EmptyNestIllustration() {
  return (
    <View style={styles.nestWrapper}>
      <Image source={emptyNestBg} style={styles.nestBg} />
      <Image source={upperLeft} style={styles.upperLeft} />
      <Image source={upperRight} style={styles.upperRight} />
      <Image source={upperRightBee} style={styles.upperRightBee} />
      <Image source={emptyNest} style={styles.nestImage} />
    </View>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, onPress, onEdit, onDelete, online }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImageFallback}>
            <MaterialCommunityIcons name="image-off-outline" size={36} color="#B0A09A" />
          </View>
        )}
        <Text style={styles.cardName} numberOfLines={1}>{item.item_name}</Text>
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.editButton, !online && styles.disabledButton]}
          onPress={onEdit}
          activeOpacity={0.7}
          disabled={!online}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={20}
            color={online ? AppColors.background : '#A0A0A0'}
          />
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity
          style={[styles.deleteButton, !online && styles.disabledDeleteButton]}
          onPress={onDelete}
          activeOpacity={0.7}
          disabled={!online}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function QrItemListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const { alertModal } = useAlertModal();

  // Search + category filter of the registered items
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  useEffect(() => {
    isOnline().then(setOnline);

    const unsubscribe = addConnectivityListener((state) => {
      const isConnected = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setOnline(isConnected);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Load categories error:', err));
  }, []);

  // Reload list every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      isOnline().then(setOnline);
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await getUserQrItems();
      setItems(data);
    } catch (err) {
      console.error('Load QR items error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (item) => {
    if (!online) return;
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteModalVisible(false);

    if (!online) {
      setItemToDelete(null);
      showToast('Cannot delete items while offline.', 'info');
      return;
    }

    try {
      const res = await deleteQrItem(itemToDelete.qr_code_id);
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.qr_code_id !== itemToDelete.qr_code_id));
        showToast('Item deleted.');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Failed to delete item.', 'error');
      }
    } catch (err) {
      console.error('Delete QR item error:', err);
      showToast('Could not connect to server.', 'error');
    } finally {
      setItemToDelete(null);
    }
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setCategoryMenuOpen(false);
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || String(item.item_name ?? '').toLowerCase().includes(q);
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some((id) => String(id) === String(item.category_id));
    return matchesSearch && matchesCategory;
  });

  let categoryDisplayText = 'All Categories';
  if (selectedCategories.length === 1) {
    categoryDisplayText =
      categories.find((c) => c.category_id === selectedCategories[0])?.category_name ??
      '1 Selected';
  } else if (selectedCategories.length > 1) {
    categoryDisplayText = `${selectedCategories.length} Selected`;
  }

  const hasActiveFilters = !!searchQuery || selectedCategories.length > 0;

  const handleCardPress = (item) => {
    router.push({
      pathname: '/(tabs)/qrItemView',
      params: { item: JSON.stringify(item) },
    });
  };

  const handleEdit = (item) => {
    router.push({
      pathname: '/(tabs)/qrItemEdit',
      params: {
        item: JSON.stringify(item),
        editSession: Date.now(),
      },
    });
  };

  return (
    <View style={styles.screen}>
      <ConfirmDiscardModal
        visible={deleteModalVisible}
        onKeepEditing={() => {
          setDeleteModalVisible(false);
          setItemToDelete(null);
        }}
        onDiscard={confirmDelete}
        message="This will remove your registered item from the system."
        cancelLabel="No, keep it"
        confirmLabel="Delete"
      />

      {alertModal}

      {/* RED HEADER */}
      <View style={[styles.redHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/qrItem')}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registered Items</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AppColors.background} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyNestIllustration />
          <Text style={styles.emptyTitle}>Nothing here yet!</Text>
          <Text style={styles.emptySubtitle}>
            You have no registered items currently.{'\n'}Any new items you register will appear here.
          </Text>
        </View>
      ) : (
        <>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={AppColors.background}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Item"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="#B0A09A" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter */}
          <View style={styles.filterBar}>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[
                  styles.filterTrigger,
                  (categoryMenuOpen || selectedCategories.length > 0) &&
                    styles.filterTriggerActive,
                ]}
                onPress={() => setCategoryMenuOpen((open) => !open)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTriggerText,
                    (categoryMenuOpen || selectedCategories.length > 0) &&
                      styles.filterTriggerTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {categoryDisplayText}
                </Text>
                <Ionicons
                  name={categoryMenuOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={AppColors.background}
                />
              </TouchableOpacity>

              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearFilters}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={14} color={AppColors.background} />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {categoryMenuOpen && (
              <View style={styles.dropdownCard}>
                <View style={styles.chipRow}>
                  <FilterChip
                    label="All Categories"
                    isActive={selectedCategories.length === 0}
                    onPress={() => {
                      setSelectedCategories([]);
                      setCategoryMenuOpen(false);
                    }}
                  />
                  {categories.map((cat) => (
                    <FilterChip
                      key={cat.category_id}
                      label={cat.category_name}
                      isActive={selectedCategories.includes(cat.category_id)}
                      onPress={() => toggleCategory(cat.category_id)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          {filteredItems.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="search-outline" size={48} color="#C5AFA7" />
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search or filter.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => String(item.qr_code_id)}
              numColumns={2}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={styles.gridRow}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <ItemCard
                  item={item}
                  online={online}
                  onPress={() => handleCardPress(item)}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item)}
                />
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

const CARD_WIDTH = '48%';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF1E0',
  },
  redHeader: {
    backgroundColor: AppColors.background,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 120,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.textOnLight,
    marginTop: 16,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  grid: {
    padding: 12,
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  cardImageFallback: {
    width: '100%',
    height: 140,
    backgroundColor: '#EDE0D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textOnLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.background,
  },
  actionDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  nestWrapper: {
    width: 280,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  nestBg: {
    width: 280,
    height: 240,
    resizeMode: 'contain',
    position: 'absolute',
  },
  nestImage: {
    width: 170,
    height: 90,
    resizeMode: 'contain',
    position: 'absolute',
    bottom: 45,
  },
  upperLeft: {
    width: 55,
    height: 55,
    resizeMode: 'contain',
    position: 'absolute',
    left: 55,
    top: 55,
  },
  upperRight: {
    width: 55,
    height: 55,
    resizeMode: 'contain',
    position: 'absolute',
    right: 60,
    top: 35,
  },
  upperRightBee: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    position: 'absolute',
    right: 42,
    top: 25,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterBar: {
    marginBottom: 10,
    backgroundColor: AppColors.surface,
    paddingVertical: 10,
    marginHorizontal: 10,
    borderRadius: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  filterTrigger: {
    flex: 1,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 0,
  },
  filterTriggerActive: {
    borderColor: '#A31D1D',
  },
  filterTriggerText: {
    fontSize: 12,
    color: '#333',
    marginRight: 5,
    flexShrink: 1,
  },
  filterTriggerTextActive: {
    color: '#A31D1D',
    fontWeight: '700',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginHorizontal: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    flexShrink: 0,
  },
  clearButtonText: {
    fontSize: 12,
    color: AppColors.background,
    fontWeight: '600',
  },
  dropdownCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    marginHorizontal: 10,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 5,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterChipActive: {
    borderColor: '#A31D1D',
  },
  filterChipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#A31D1D',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  disabledDeleteButton: {
    backgroundColor: '#A0A0A0',
    opacity: 0.7,
  },
});