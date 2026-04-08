import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFocus } from '../context/FocusContext';
import { analyticsService } from '../services/analytics';
import { StatCard } from '../components/StatCard';
import { GradientCard } from '../components/GradientCard';
import { Button } from '../components/Button';
import { COLORS, MONTHLY_POINT_CAPS } from '../constants';
import { formatPoints, formatDuration, getGreeting, getStreakEmoji } from '../utils/format';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const { isRunning } = useFocus();
  const navigation = useNavigation();
  const [todayStats, setTodayStats] = useState({ minutes: 0, sessions: 0, points: 0 });
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [today, weekly] = await Promise.all([
      analyticsService.getTodayTotal(user.id),
      analyticsService.getWeeklyTotal(user.id),
    ]);
    setTodayStats(today);
    setWeeklyMinutes(weekly);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadData()]);
    setRefreshing(false);
  };

  if (!user) return null;

  const pointsCap = MONTHLY_POINT_CAPS[user.subscription_tier];
  const pointsProgress = Math.min(user.monthly_points_earned / pointsCap, 1);

  return (
    <LinearGradient
      colors={[COLORS.background, COLORS.backgroundLight] as const}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user.display_name}</Text>
          </View>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{user.subscription_tier.toUpperCase()}</Text>
          </View>
        </View>

        {/* Points Card */}
        <GradientCard colors={[COLORS.primary, COLORS.primaryDark] as const} style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <View>
              <Text style={styles.pointsLabel}>Total Points</Text>
              <Text style={styles.pointsValue}>{formatPoints(user.total_points)}</Text>
            </View>
            <View style={styles.streakContainer}>
              <Text style={styles.streakEmoji}>{getStreakEmoji(user.current_streak)}</Text>
              <Text style={styles.streakValue}>{user.current_streak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          </View>

          {/* Monthly Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Monthly Points</Text>
              <Text style={styles.progressValue}>
                {user.monthly_points_earned} / {pointsCap}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${pointsProgress * 100}%` },
                ]}
              />
            </View>
          </View>
        </GradientCard>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.statsRow}>
          <StatCard
            icon="time-outline"
            label="Focus Time"
            value={formatDuration(todayStats.minutes)}
            color={COLORS.primary}
          />
          <View style={{ width: 8 }} />
          <StatCard
            icon="checkmark-circle-outline"
            label="Sessions"
            value={todayStats.sessions.toString()}
            color={COLORS.accent}
          />
          <View style={{ width: 8 }} />
          <StatCard
            icon="star-outline"
            label="Points"
            value={formatPoints(todayStats.points)}
            color={COLORS.warning}
          />
        </View>

        {/* Weekly Summary */}
        <GradientCard style={styles.weeklyCard}>
          <View style={styles.weeklyRow}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
            <View style={styles.weeklyInfo}>
              <Text style={styles.weeklyLabel}>This Week</Text>
              <Text style={styles.weeklyValue}>{formatDuration(weeklyMinutes)} focused</Text>
            </View>
          </View>
        </GradientCard>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <Button
            title={isRunning ? 'Session Active...' : 'Start Focus'}
            onPress={() => (navigation as any).navigate('Timer')}
            disabled={isRunning}
            size="large"
            style={styles.focusButton}
          />
        </View>

        {/* Longest Streak */}
        <GradientCard style={styles.achievementCard}>
          <View style={styles.achievementRow}>
            <View style={styles.achievementIcon}>
              <Ionicons name="trophy" size={24} color={COLORS.gold} />
            </View>
            <View style={styles.achievementInfo}>
              <Text style={styles.achievementLabel}>Longest Streak</Text>
              <Text style={styles.achievementValue}>
                {user.longest_streak} days
              </Text>
            </View>
            <View>
              <Text style={styles.totalFocus}>
                {formatDuration(user.total_focus_minutes)} total
              </Text>
            </View>
          </View>
        </GradientCard>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  tierBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  pointsCard: {
    padding: 20,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pointsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
  },
  streakContainer: {
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  streakLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  progressSection: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  progressValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
  },
  weeklyCard: {
    marginTop: 8,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyInfo: {
    marginLeft: 12,
  },
  weeklyLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  weeklyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionsRow: {
    marginBottom: 8,
  },
  focusButton: {
    width: '100%',
  },
  achievementCard: {},
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  achievementLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  achievementValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalFocus: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
