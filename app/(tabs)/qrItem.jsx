import AppColors from '@/constants/AppColors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MENU_ITEMS = [
  {
    key: 'register',
    label: 'Register an Item',
    icon: 'qrcode',
    iconLib: 'material-community',
    route: '/(tabs)/qrItemRegister',
  },
  {
    key: 'view',
    label: 'View Registered Items',
    icon: 'format-list-bulleted',
    iconLib: 'material-community',
    route: '/(tabs)/qrItemList',
  },
  {
    key: 'scan',
    label: 'Scan An Item',
    icon: 'crop-free',
    iconLib: 'material-community',
    route: '/(tabs)/qrItemScan',
  },
];

export default function QrItemScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = (item) => {
    if (item.key === 'register') {
      router.push(item.route);
      return;
    }
    // view and scan — coming soon
    router.push(item.route);
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>

      {/* RED HEADER */}
      <View style={[styles.redHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/profile')}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Item</Text>
        </View>
      </View>

      {/* MENU CARD */}
      <View style={styles.body}>
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <View key={item.key}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => handlePress(item)}
                activeOpacity={0.6}
              >
                <View style={styles.iconWrapper}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color={AppColors.textOnLight}
                  />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={AppColors.textMuted}
                />
              </TouchableOpacity>
              {index < MENU_ITEMS.length - 1 && (
                <View style={styles.separator} />
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

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
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  iconWrapper: {
    width: 28,
    marginRight: 14,
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: AppColors.textOnLight,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 12,
  },
});