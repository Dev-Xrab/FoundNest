import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppColors from '@/constants/AppColors';
import { useReportLeaveGuard } from '@/hooks/useReportLeaveGuard';
import { getActiveUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';

// --- Sizes (change these if you want a bigger/smaller bar) ---
const FLOAT_BUTTON_SIZE = 72;
const FLOAT_BUTTON_RADIUS = FLOAT_BUTTON_SIZE / 2;
const BAR_TOP_RADIUS = 22;

// --- Icon names for each side tab (Ionicons from @expo/vector-icons) ---
const TAB_ICONS = {
  index: {
    label: 'Home',
    active: 'home', // filled when selected
    inactive: 'home-outline',
  },
  map: {
    label: 'Map',
    active: 'map-outline',
    inactive: 'map-outline',
  },
  find: {
    label: 'Find',
    active: 'search-outline',
    inactive: 'search-outline',
  },
  profile: {
    label: 'Profile',
    active: 'person-circle-outline',
    inactive: 'person-circle-outline',
  },
};

/**
 * Switches to a tab when the user taps a button.
 * (React Navigation needs this small ceremony instead of only changing UI.)
 *
 * Checked against two guards before actually switching, in order:
 *  1. Whichever screen is currently focused and has its own
 *     `useUnsavedChangesGuard` active (Edit Report, Change Password, QR
 *     Register/Edit, etc.) — tab switches don't fire `beforeRemove`, so
 *     that hook can't see this on its own; this reads its live state via
 *     the shared registry instead.
 *  2. `guardedNavigate`, which is specifically about the report-creation
 *     wizard's draft (a different, older mechanism kept as-is).
 * Checking before calling navigate() (rather than reacting to the tab
 * switch after the fact) avoids a visible flash of the destination tab
 * before snapping back.
 */
function goToTab(navigation, routeName, isAlreadySelected, guardedNavigate) {
  if (isAlreadySelected) {
    return;
  }

  const activeGuard = getActiveUnsavedChangesGuard();
  if (activeGuard && activeGuard.hasChanges()) {
    activeGuard.attemptLeave(() => navigation.navigate(routeName));
    return;
  }

  guardedNavigate(() => navigation.navigate(routeName));
}

/**
 * One normal tab on the left or right (Home, Map, Find, Profile).
 */
function SideTabButton({ label, iconName, isSelected, onPress }) {
  const iconColor = isSelected ? AppColors.activeIcon : AppColors.inactiveIcon;

  return (
    <Pressable onPress={onPress} style={styles.sideTab}>
      <Ionicons name={iconName} size={24} color={iconColor} />
      <Text style={styles.sideLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * Center "Report" button that floats above the white bar.
 */
function ReportFloatingButton({ isSelected, onPress }) {
  const iconColor = isSelected ? AppColors.activeIcon : AppColors.inactiveIcon;

  return (
    <View style={styles.floatWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.floatButton, pressed && styles.floatPressed]}>
        <View style={styles.reportIconWrap}>
          <Ionicons name="document-text-outline" size={28} color={iconColor} />
          <View style={styles.plusBadge}>
            <Ionicons name="add" size={12} color={iconColor} />
          </View>
        </View>
        <Text style={styles.floatLabel}>Report</Text>
      </Pressable>
    </View>
  );
}

/**
 * Custom bottom tab bar — same look as before, written in a simpler layout.
 *
 * React Navigation passes: state (which tab is open), navigation (how to switch tabs).
 */
export default function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 1);
  const { guardedNavigate, LeaveGuardModal } = useReportLeaveGuard();

  // Which tab screen is open right now? (e.g. "index", "map", "report")
  const currentRouteName = state.routes[state.index].name;

  // Pick filled vs outline icon for side tabs
  function getSideTabIcon(routeName) {
    const tab = TAB_ICONS[routeName];
    return currentRouteName === routeName ? tab.active : tab.inactive;
  }

  return (
    <View style={[styles.root, { paddingBottom: bottomPadding }]}>
      {LeaveGuardModal}

      {/* White bar with rounded top corners */}
      <View style={styles.bar}>
        {/* Row of 4 side tabs + empty space in the middle for the floating button */}
        <View style={styles.row}>
          <SideTabButton
            label={TAB_ICONS.index.label}
            iconName={getSideTabIcon('index')}
            isSelected={currentRouteName === 'index'}
            onPress={() => goToTab(navigation, 'index', currentRouteName === 'index', guardedNavigate)}
          />

          <SideTabButton
            label={TAB_ICONS.map.label}
            iconName={getSideTabIcon('map')}
            isSelected={currentRouteName === 'map'}
            onPress={() => goToTab(navigation, 'map', currentRouteName === 'map', guardedNavigate)}
          />

          {/* Empty gap so the floating Report button does not overlap Map / Find */}
          <View style={styles.centerSpacer} />

          <SideTabButton
            label={TAB_ICONS.find.label}
            iconName={getSideTabIcon('find')}
            isSelected={currentRouteName === 'find'}
            onPress={() => goToTab(navigation, 'find', currentRouteName === 'find', guardedNavigate)}
          />

          <SideTabButton
            label={TAB_ICONS.profile.label}
            iconName={getSideTabIcon('profile')}
            isSelected={currentRouteName === 'profile'}
            onPress={() => goToTab(navigation, 'profile', currentRouteName === 'profile', guardedNavigate)}
          />
        </View>

        {/* Report sits on top of the bar (absolute position) */}
        <ReportFloatingButton
          isSelected={currentRouteName === 'report'}
          onPress={() => goToTab(navigation, 'report', currentRouteName === 'report', guardedNavigate)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'transparent',
  },
  bar: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: BAR_TOP_RADIUS ,
    borderTopRightRadius: BAR_TOP_RADIUS,
    paddingTop: FLOAT_BUTTON_RADIUS - 25,
    paddingBottom: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  centerSpacer: {
    width: FLOAT_BUTTON_SIZE,
  },
  sideTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    minWidth: 0,
  },
  sideLabel: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '500',
    color: AppColors.label,
  },
  floatWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: FLOAT_BUTTON_RADIUS -60,
    alignItems: 'center',
  },
  floatButton: {
    width: FLOAT_BUTTON_SIZE,
    height: FLOAT_BUTTON_SIZE,
    borderRadius: FLOAT_BUTTON_RADIUS,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  floatPressed: {
    opacity: 0.92,
  },
  reportIconWrap: {
    position: 'relative',
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: AppColors.label,
  },
});
