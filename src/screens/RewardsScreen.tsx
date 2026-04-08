import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { rewardService } from '../services/rewards';
import { GradientCard } from '../components/GradientCard';
import { Button } from '../components/Button';
import { COLORS } from '../constants';
import { formatPoints } from '../utils/format';
import { Reward, Redemption } from '../types';

export function RewardsScreen() {
  const { user, refreshUser } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [history, setHistory] = useState<Redemption[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'store' | 'history'>('store');
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [rewardsList, redemptionHistory] = await Promise.all([
      rewardService.getRewards(),
      rewardService.getRedemptionHistory(user.id),
    ]);
    setRewards(rewardsList);
    setHistory(redemptionHistory);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRedeem = async (reward: Reward) => {
    if (!user) return;

    Alert.alert(
      'Redeem Reward',
      `Spend ${reward.points_cost} points for "${reward.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setRedeeming(reward.id);
            const { error } = await rewardService.redeemReward(
              user.id,
              reward.id,
              user.total_points,
              user.subscription_tier
            );
            setRedeeming(null);

            if (error) {
              Alert.alert('Error', error);
            } else {
              Alert.alert('Success', 'Reward redeemed! Check your history for the code.');
              await Promise.all([refreshUser(), loadData()]);
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  const isPaidUser = user.subscription_tier !== 'free';

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
        <Text style={styles.screenTitle}>Rewards</Text>

        {/* Points Balance */}
        <GradientCard colors={[COLORS.primary, COLORS.primaryDark] as const} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Points</Text>
          <Text style={styles.balanceValue}>{formatPoints(user.total_points)}</Text>
        </GradientCard>

        {!isPaidUser && (
          <GradientCard colors={[COLORS.warning + '30', COLORS.warning + '10'] as const} style={styles.upgradeCard}>
            <View style={styles.upgradeRow}>
              <Ionicons name="lock-closed" size={20} color={COLORS.warning} />
              <Text style={styles.upgradeText}>
                Upgrade to a paid plan to redeem rewards
              </Text>
            </View>
          </GradientCard>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'store' && styles.tabActive]}
            onPress={() => setTab('store')}
          >
            <Text style={[styles.tabText, tab === 'store' && styles.tabTextActive]}>
              Store
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'history' && styles.tabActive]}
            onPress={() => setTab('history')}
          >
            <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'store' ? (
          rewards.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No rewards available yet</Text>
            </View>
          ) : (
            rewards.map((reward) => (
              <GradientCard key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardRow}>
                  <View style={styles.rewardIcon}>
                    <Ionicons
                      name={
                        reward.category === 'gift_card'
                          ? 'card-outline'
                          : reward.category === 'discount_coupon'
                          ? 'pricetag-outline'
                          : 'diamond-outline'
                      }
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardName}>{reward.name}</Text>
                    <Text style={styles.rewardDesc}>{reward.description}</Text>
                    <Text style={styles.rewardStock}>
                      {reward.stock > 0 ? `${reward.stock} left` : 'Out of stock'}
                    </Text>
                  </View>
                  <View style={styles.rewardAction}>
                    <Text style={styles.rewardCost}>{reward.points_cost}</Text>
                    <Text style={styles.rewardCostLabel}>pts</Text>
                    <Button
                      title="Redeem"
                      onPress={() => handleRedeem(reward)}
                      size="small"
                      disabled={
                        !isPaidUser ||
                        user.total_points < reward.points_cost ||
                        reward.stock <= 0 ||
                        redeeming === reward.id
                      }
                      loading={redeeming === reward.id}
                      style={styles.redeemButton}
                    />
                  </View>
                </View>
              </GradientCard>
            ))
          )
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No redemptions yet</Text>
          </View>
        ) : (
          history.map((item) => (
            <GradientCard key={item.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View>
                  <Text style={styles.historyName}>
                    {item.reward?.name || 'Reward'}
                  </Text>
                  <Text style={styles.historyCode}>
                    Code: {item.redemption_code || 'Pending'}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyPoints}>-{item.points_spent} pts</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === 'fulfilled'
                            ? COLORS.accent + '20'
                            : item.status === 'pending'
                            ? COLORS.warning + '20'
                            : COLORS.error + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === 'fulfilled'
                              ? COLORS.accent
                              : item.status === 'pending'
                              ? COLORS.warning
                              : COLORS.error,
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            </GradientCard>
          ))
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
  balanceCard: {
    alignItems: 'center',
    padding: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
  },
  upgradeCard: {
    marginTop: 8,
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeText: {
    fontSize: 13,
    color: COLORS.warning,
    marginLeft: 8,
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 20,
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
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
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
  rewardCard: {
    marginBottom: 4,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rewardName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  rewardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rewardStock: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rewardAction: {
    alignItems: 'center',
    marginLeft: 8,
  },
  rewardCost: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.warning,
  },
  rewardCostLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  redeemButton: {},
  historyCard: {
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  historyCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
