import AppColors from '@/constants/AppColors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReportSuccess() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Extract navigation parameters
  const { source, reportObject } = useLocalSearchParams();
  const isEdit = source === 'edit';

  const handleEditPress = () => {
    if (!reportObject) {
      // Direct global safety fallback if params are empty
      router.navigate('/(tabs)/profileReportHistory');
      return;
    }

    if (isEdit) {
      // ── Scenario A: Return to Edit Flow ──
      router.navigate({
        pathname: '/(tabs)/profileReportHistoryEdit',
        params: {
          report: reportObject, 
          editSession: Date.now()
        }
      });
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Top row: heart + dynamic headers ── */}
      <View style={styles.topRow}>
        <Image
          source={require('@/assets/images/happy-heart.png')}
          style={styles.heartImage}
          resizeMode="contain"
        />
        <View style={styles.titleBlock}>
          <Text style={styles.successTitle}>
            {isEdit ? 'Report Updated!' : 'Report Successful!'}
          </Text>
          <Text style={styles.successSubtitle}>
            {isEdit
              ? `Your lost item report has been updated. We'll continue searching and notify you if we find a potential match.`
              : `We've secured your lost report and immediately started searching for a match. Rest assured, we'll notify you if we find it.`
            }
          </Text>
        </View>
      </View>

      {/* ── Card: dynamic text point markers ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What happens next?</Text>

        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Your {isEdit ? 'updated' : 'detailed'} description has been{' '}
            {isEdit ? 'saved to' : 'added to'} our records.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            Our system is now automatically searching and comparing your
            report against all old and newly found items.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>
            We will notify you immediately via email or in-app notifications
            if a potential match is reported by a finder.
          </Text>
        </View>

        {/* ── Horizontal divider rule ── */}
        <View style={styles.actionSeparator} />

        {/* ── Unified Layout Actions ── */}
        <View style={[styles.actions, !isEdit && styles.actionsCentered]}>
          {isEdit && (
            <TouchableOpacity
              activeOpacity={0.4}
              onPress={handleEditPress}
              style={styles.editButton}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={14}
                color={AppColors.primary ?? AppColors.background}
              />
              <Text style={styles.editButtonText}>  Edit Report</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.4}
            onPress={() => router.replace('/(tabs)/profileReportHistory')}
          >
            <Text style={styles.historyButtonText}>
              {isEdit ? 'Report History  →' : 'View Report History  →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  heartImage: {
    width: 110,
    height: 110,
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppColors.textOnLight,
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    color: AppColors.textOnLight,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: AppColors.textOnLight,
    lineHeight: 20,
    textAlign: 'justify',
  },
  actionSeparator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  actionsCentered: {
    justifyContent: 'center',
    paddingVertical: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.primary ?? AppColors.background,
  },
  historyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.primary ?? AppColors.background,
  },
});