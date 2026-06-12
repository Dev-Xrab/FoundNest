import CancelReasonModal from '@/components/CancelReasonModal';
import Toast from '@/components/Toast';
import { API_BASE_URL } from '@/constants/api';
import AppColors from '@/constants/AppColors';
import { fetchWithAuth } from '@/constants/authApi';
import { getToken, getUser } from '@/constants/StudentData';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Nest illustration (empty state) ──────────────────────────────────────────
const emptyNestBg   = require('@/assets/images/Empty Nest/empty-nest-bg.png');
const emptyNest     = require('@/assets/images/Empty Nest/empty-nest.png');
const upperLeft     = require('@/assets/images/Empty Nest/upper-left.png');
const upperRight    = require('@/assets/images/Empty Nest/upper-right.png');
const upperRightBee = require('@/assets/images/Empty Nest/upper-right-bee.png');

function EmptyNestIllustration() {
  return (
    <View style={styles.nestWrapper}>
      <Image source={emptyNestBg}    style={styles.nestBg} />
      <Image source={upperLeft}      style={styles.upperLeft} />
      <Image source={upperRight}     style={styles.upperRight} />
      <Image source={upperRightBee}  style={styles.upperRightBee} />
      <Image source={emptyNest}      style={styles.nestImage} />
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Merges lost reports (base list) with notification rows (matches).
 * Every lost report appears as a card regardless of match status.
 * Notifications are attached to their respective report via lost_report_id.
 */
function mergeReportsAndNotifs(reportsData, notifsData) {
  // Build a map of lost_report_id → notification rows (matches only)
  const notifMap = new Map();
  for (const n of notifsData) {
    if (!n.found_report_id) continue;
    if (!notifMap.has(n.lost_report_id)) {
      notifMap.set(n.lost_report_id, []);
    }
    notifMap.get(n.lost_report_id).push(n);
  }

  // Every lost report becomes a card; matches attached if any exist
  return reportsData.map((r) => ({
    lost_report_id:   r.lost_report_id,
    lost_item_name:   r.item_name,
    lost_item_image:  r.image_url,
    lost_date:        r.date_reported,
    actual_lost_date: r.lost_date,
    location_lost:    r.location_lost,
    status:           r.status,
    // Fields needed to pre-fill the edit form
    item_name:        r.item_name,
    description:      r.description,
    contents:         r.contents,
    category_id:      r.category_id,
    matches:          notifMap.get(r.lost_report_id) ?? [],
  }));
}

// ── Match card (shown when expanded) — vertical grid tile ────────────────────
function MatchCard({ match, label, onPress }) {
  return (
    <View style={styles.matchCardWrapper}>
      {/* "Potential Match N" label sits above the card */}
      <Text style={styles.matchLabel}>{label}</Text>

      <TouchableOpacity
        style={styles.matchCard}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {/* Square image + badge overlay */}
        <View style={styles.matchImageContainer}>
          {match.found_item_image ? (
            <Image source={{ uri: match.found_item_image }} style={styles.matchImage} />
          ) : (
            <View style={[styles.matchImage, styles.matchImageFallback]}>
              <MaterialCommunityIcons name="image-off-outline" size={28} color="#B0A09A" />
            </View>
          )}

          {/* Category badge — white pill, bottom-right of image */}
          {match.found_category_name ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText} numberOfLines={1}>
                {match.found_category_name}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Text info below image */}
        <View style={styles.matchInfo}>
          <Text style={styles.matchName} numberOfLines={2}>
            {match.found_item_name ?? '—'}
          </Text>
          <View style={styles.matchDivider} />
          <View style={styles.matchMeta}>
            <Ionicons name="calendar-outline" size={11} color={AppColors.textMuted} />
            <Text style={styles.matchMetaText} numberOfLines={1}>
              {formatDate(match.found_date)}
            </Text>
          </View>
          <View style={styles.matchMeta}>
            <Ionicons name="location-outline" size={11} color={AppColors.textMuted} />
            <Text style={styles.matchMetaText} numberOfLines={1}>
              {match.location_found ?? '—'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────
function ReportCard({ report, onCancel, router }) {
  const [expanded, setExpanded] = useState(false);
  const hasMatches = report.matches.length > 0;

  const handleMatchPress = (match) => {
    router.push({
      pathname: '/(tabs)/profileReportHistoryView',
      params: { match: JSON.stringify(match) },
    });
  };

  return (
    <View style={styles.reportCard}>

      {/* ── Top section: image + info + badge ── */}
      <View style={styles.reportTop}>
        {report.lost_item_image ? (
          <Image source={{ uri: report.lost_item_image }} style={styles.reportImage} />
        ) : (
          <View style={[styles.reportImage, styles.reportImageFallback]}>
            <MaterialCommunityIcons name="image-off-outline" size={32} color="#B0A09A" />
          </View>
        )}

        <View style={styles.reportMeta}>
          {hasMatches && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>Potential Match Found!</Text>
            </View>
          )}
          <Text style={styles.reportLabel}>Lost Item Name:</Text>
          <Text style={styles.reportItemName}>{report.lost_item_name ?? '—'}</Text>
          <Text style={styles.reportLabel}>Date Reported:</Text>
          <Text style={styles.reportDate}>{formatDate(report.lost_date)}</Text>
        </View>
      </View>

      {/* ── Divider + View Matches toggle ── */}
      {hasMatches && (
        <>
          <View style={styles.matchDividerLine} />
          <TouchableOpacity
            style={styles.viewMatchesButton}
            onPress={() => setExpanded((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewMatchesText}>
              {expanded ? 'Hide Matches' : 'View Matches'}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={AppColors.background}
            />
          </TouchableOpacity>
        </>
      )}

      {/* ── Match cards (expanded) — 2-per-row grid ── */}
      {expanded && (
        <View style={styles.matchGrid}>
          {report.matches.map((match, index) => (
            <MatchCard
              key={match.notification_id}
              match={match}
              label={`Potential Match ${index + 1}`}
              onPress={() => handleMatchPress(match)}
            />
          ))}
        </View>
      )}

      {/* ── Action buttons ── */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editButton}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/profileReportHistoryEdit',
              params: { report: JSON.stringify(report), editSession: Date.now(), },
            })
          }
        >
          <MaterialCommunityIcons name="pencil-outline" size={16} color={AppColors.background} />
          <Text style={styles.editButtonText}>Edit Report</Text>
        </TouchableOpacity>
        {report.status !== 'resolved' && (
          <>
            <View style={styles.actionDivider} />
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel Report</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileReportHistory() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { toast: toastParam } = useLocalSearchParams();

  const [reports,  setReports]  = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [reportToCancel, setReportToCancel] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Show toast if navigated back from Edit with cancel param
  useEffect(() => {
    if (toastParam === 'editCancelled') {
      setToastMessage('Edit has been cancelled.');
      setToastVisible(true);
    }
  }, [toastParam]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const user = await getUser();
      if (!user) return;

      const token = await getToken();
      if (!token) return;

      // Fetch lost reports + notifications in parallel
      const [reportsRes, notifsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/api/lost-reports/user/${user.user_id}`),
        fetchWithAuth(`${API_BASE_URL}/api/notifications/user/${user.user_id}`),
      ]);

      if (!reportsRes.ok) {
        const text = await reportsRes.text();
        console.error('Failed to load lost reports:', reportsRes.status, text);
        setReports([]);
        return;
      }
      if (!notifsRes.ok) {
        const text = await notifsRes.text();
        console.error('Failed to load notifications:', notifsRes.status, text);
        return;
      }

      const [reportsData, notifsData] = await Promise.all([
        reportsRes.json(),
        notifsRes.json(),
      ]);

      setReports(mergeReportsAndNotifs(reportsData, notifsData));
    } catch (err) {
      console.error('Load report history error:', err?.message ?? err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPress = (report) => {
    setReportToCancel(report);
    setCancelModalVisible(true);
  };

  const confirmCancel = async (reason) => {
    if (!reportToCancel) return;
    setCancelModalVisible(false);

    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/lost-reports/${reportToCancel.lost_report_id}/cancel`,
        { method: 'PUT' }
      );
      if (res.ok) {
        setReports((prev) =>
          prev.filter((r) => r.lost_report_id !== reportToCancel.lost_report_id)
        );
        setToastMessage('Report Cancelled. Thank you for your feedback!');
        setToastVisible(true);
      } else {
        const data = await res.json();
        console.error('Cancel report failed:', data.error);
      }
    } catch (err) {
      console.error('Cancel report error:', err);
    } finally {
      setReportToCancel(null);
    }
  };

  return (
    <View style={styles.screen}>

      <CancelReasonModal
        visible={cancelModalVisible}
        onKeepIt={() => {
          setCancelModalVisible(false);
          setReportToCancel(null);
        }}
        onConfirmCancel={confirmCancel}
      />

      <Toast
        visible={toastVisible}
        type="info"
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />

      {/* ── Red header ─────────────────────────────────────────────────── */}
      <View style={[styles.redHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/profile')}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report History</Text>
        </View>
      </View>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AppColors.background} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyNestIllustration />
          <Text style={styles.emptyTitle}>Nothing here yet!</Text>
          <Text style={styles.emptySubtitle}>
            Your report history is currently empty.{'\n'}Any new report you make will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {reports.map((report) => (
            <ReportCard
              key={report.lost_report_id}
              report={report}
              router={router}
              onCancel={() => handleCancelPress(report)}
            />
          ))}
        </ScrollView>
      )}

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF1E0',
  },

  // ── Header
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

  // ── Loading / empty
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

  // ── List
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // ── Report card
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  reportTop: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  reportImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  reportImageFallback: {
    backgroundColor: '#EDE0D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  matchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5C518',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  reportLabel: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  reportItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.textOnLight,
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textOnLight,
  },

  // ── View Matches button (yellow)
  viewMatchesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F5C518',
  },
  viewMatchesText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.background,
  },
  matchDividerLine: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginHorizontal: 14,
    marginBottom: 12,
  },

  // ── Match grid (2 per row)
  matchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingBottom: 4,
    gap: 10,
  },
  matchCardWrapper: {
    width: '47%',
  },
  matchLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: AppColors.textOnLight,
    marginBottom: 6,
  },
  matchCard: {
    backgroundColor: '#FAF6F2',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  matchImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  matchImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  matchImageFallback: {
    backgroundColor: '#EDE0D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.textOnLight,
  },
  matchInfo: {
    padding: 8,
    gap: 3,
  },
  matchDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4,
  },
  matchName: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textOnLight,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  matchMetaText: {
    fontSize: 10,
    color: AppColors.textMuted,
    flexShrink: 1,
  },

  // ── Action buttons
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
  },
  actionDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.background,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    backgroundColor: AppColors.background,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Empty nest illustration
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