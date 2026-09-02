import ConfirmDiscardModal from '@/components/ConfirmDiscardModal';
import AppColors from '@/constants/AppColors';
import { deleteQrItem, getUserQrItems } from '@/constants/qrItems';
import { useAlertModal } from '@/shared/hooks/useAlertModal';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
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

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, onPress, onEdit, onDelete }) {
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
          style={styles.editButton}
          onPress={onEdit}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="pencil-outline" size={20} color={AppColors.background} />
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.7}
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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const { alertModal, showAlert } = useAlertModal();

  // Reload list every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
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
    setItemToDelete(item);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteModalVisible(false);

    try {
      const res = await deleteQrItem(itemToDelete.qr_code_id);
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.qr_code_id !== itemToDelete.qr_code_id));
      } else {
        const data = await res.json();
        showAlert({ message: data.message || 'Failed to delete item.' });
      }
    } catch (err) {
      console.error('Delete QR item error:', err);
      showAlert({ message: 'Could not connect to server.' });
    } finally {
      setItemToDelete(null);
    }
  };

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
        confirmLabel="Confirm Cancel"
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
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.qr_code_id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => handleCardPress(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
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
});