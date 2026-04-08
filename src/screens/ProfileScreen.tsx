import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';
import { userService } from '../services/user';
import { analyticsService } from '../services/analytics';
import { GradientCard } from '../components/GradientCard';
import { Button } from '../components/Button';
import { COLORS, SUBSCRIPTION_PLANS } from '../constants';
import { formatDuration, formatPoints, formatDate } from '../utils/format';
import { LeaderboardEntry } from '../types';

export function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [showReferral, setShowReferral] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tab, setTab] = useState<'profile' | 'subscription' | 'leaderboard'>('profile');
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    const data = await analyticsService.getLeaderboard();
    setLeaderboard(data);
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadLeaderboard()]);
    setRefreshing(false);
  };

  const handleShareReferral = async () => {
    if (!user) return;
    await Share.share({
      message: `Join FocusRewards and earn points for staying focused! Use my referral code: ${user.referral_code}`,
    });
  };

  const handleApplyReferral = async () => {
    if (!user || !referralInput.trim()) return;
    const { error } = await userService.applyReferralCode(user.id, referralInput.trim().toUpperCase());
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Success', 'Referral code applied! You both earned bonus points.');
      setReferralInput('');
      setShowReferral(false);
      await refreshUser();
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => authService.signOut() },
    ]);
  };

  if (!user) return null;

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
        <Text style={styles.screenTitle}>Profile</Text>

        {/* User Info */}
        <GradientCard style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.userName}>{user.display_name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{formatDuration(user.total_focus_minutes)}</Text>
              <Text style={styles.profileStatLabel}>Total Focus</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{user.longest_streak}d</Text>
              <Text style={styles.profileStatLabel}>Best Streak</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>{formatPoints(user.total_points)}</Text>
              <Text style={styles.profileStatLabel}>Points</Text>
            </View>
          </View>
        </GradientCard>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['profile', 'subscription', 'leaderboard'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'profile' && (
          <>
            {/* Referral */}
            <GradientCard style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <View>
                  <Text style={styles.referralTitle}>Refer Friends</Text>
                  <Text style={styles.referralSubtext}>
                    Both you and your friend earn 25 points!
                  </Text>
                </View>
                <TouchableOpacity onPress={handleShareReferral} style={styles.shareButton}>
                  <Ionicons name="share-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Your Code</Text>
                <Text style={styles.codeValue}>{user.referral_code}</Text>
              </View>

              {!user.referred_by && (
                <TouchableOpacity
                  onPress={() => setShowReferral(!showReferral)}
                  style={styles.applyToggle}
                >
                  <Text style={styles.applyToggleText}>Have a referral code?</Text>
                </TouchableOpacity>
              )}

              {showReferral && (
                <View style={styles.applyRow}>
                  <TextInput
                    style={styles.referralInput}
                    placeholder="Enter code"
                    placeholderTextColor={COLORS.textMuted}
                    value={referralInput}
                    onChangeText={setReferralInput}
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                  <Button
                    title="Apply"
                    onPress={handleApplyReferral}
                    size="small"
                  />
                </View>
              )}
            </GradientCard>

            {/* Account Info */}
            <GradientCard>
              <Text style={styles.sectionLabel}>Account</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member since</Text>
                <Text style={styles.infoValue}>{formatDate(user.created_at)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Plan</Text>
                <Text style={styles.infoValue}>{user.subscription_tier.toUpperCase()}</Text>
              </View>
            </GradientCard>

            <Button
              title="Sign Out"
              onPress={handleSignOut}
              variant="outline"
              size="medium"
              style={styles.signOutButton}
            />
          </>
        )}

        {tab === 'subscription' && (
          <>
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = user.subscription_tier === plan.tier;
              return (
                <GradientCard
                  key={plan.tier}
                  style={styles.planCard}
                  colors={
                    isCurrent
                      ? ([COLORS.primary + '30', COLORS.primaryDark + '20'] as const)
                      : ([COLORS.surface, COLORS.surfaceLight] as const)
                  }
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planPrice}>
                    {plan.price === 0 ? 'Free' : `${plan.currency}${plan.price}/mo`}
                  </Text>
                  {plan.features.map((feature, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons name="checkmark" size={16} color={COLORS.accent} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                  {!isCurrent && plan.price > 0 && (
                    <Button
                      title="Upgrade"
                      onPress={() =>
                        Alert.alert(
                          'Upgrade',
                          'Payment integration (Razorpay/Play Billing) will be configured with your credentials.'
                        )
                      }
                      size="medium"
                      style={styles.upgradeButton}
                    />
                  )}
                </GradientCard>
              );
            })}
          </>
        )}

        {tab === 'leaderboard' && (
          <>
            {leaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="podium-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No data yet</Text>
              </View>
            ) : (
              leaderboard.map((entry) => (
                <GradientCard key={entry.user_id} style={styles.leaderboardCard}>
                  <View style={styles.leaderboardRow}>
                    <View style={styles.rankContainer}>
                      <Text
                        style={[
                          styles.rankText,
                          entry.rank === 1 && { color: COLORS.gold },
                          entry.rank === 2 && { color: COLORS.silver },
                          entry.rank === 3 && { color: COLORS.bronze },
                        ]}
                      >
                        #{entry.rank}
                      </Text>
                    </View>
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName}>{entry.display_name}</Text>
                      <Text style={styles.leaderboardStat}>
                        {formatDuration(entry.total_focus_minutes)} focused
                      </Text>
                    </View>
                    <View style={styles.leaderboardStreak}>
                      <Ionicons name="flame" size={14} color={COLORS.secondary} />
                      <Text style={styles.streakText}>{entry.current_streak}d</Text>
                    </View>
                  </View>
                </GradientCard>
              ))
            )}
          </>
        )}
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
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  profileStat: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.surfaceLight,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  referralCard: {
    marginBottom: 8,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  referralSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  codeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 2,
  },
  applyToggle: {
    marginTop: 10,
  },
  applyToggleText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  applyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  referralInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 16,
    letterSpacing: 2,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  signOutButton: {
    marginTop: 20,
  },
  planCard: {
    marginBottom: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  currentBadge: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  upgradeButton: {
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  leaderboardCard: {
    marginBottom: 4,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 8,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  leaderboardStat: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  leaderboardStreak: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
    marginLeft: 4,
  },
});
