import { supabase } from './supabase';
import { Reward, Redemption } from '../types';

export const rewardService = {
  async getRewards(): Promise<Reward[]> {
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true });

    return data || [];
  },

  async redeemReward(
    userId: string,
    rewardId: string,
    userPoints: number,
    subscriptionTier: string
  ): Promise<{ redemption: Redemption | null; error: string | null }> {
    if (subscriptionTier === 'free') {
      return { redemption: null, error: 'Upgrade to a paid plan to access the reward store' };
    }

    const { data: reward } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .single();

    if (!reward) return { redemption: null, error: 'Reward not found' };
    if (!reward.is_active) return { redemption: null, error: 'Reward is no longer available' };
    if (reward.stock <= 0) return { redemption: null, error: 'Reward is out of stock' };
    if (userPoints < reward.points_cost) return { redemption: null, error: 'Not enough points' };

    const redemptionCode = generateRedemptionCode();

    const { data: redemption, error } = await supabase
      .from('redemptions')
      .insert({
        user_id: userId,
        reward_id: rewardId,
        points_spent: reward.points_cost,
        status: 'pending',
        redemption_code: redemptionCode,
      })
      .select()
      .single();

    if (error) return { redemption: null, error: error.message };

    await supabase
      .from('rewards')
      .update({ stock: reward.stock - 1 })
      .eq('id', rewardId);

    await supabase.rpc('deduct_points', {
      p_user_id: userId,
      p_points: reward.points_cost,
    });

    return { redemption, error: null };
  },

  async getRedemptionHistory(userId: string): Promise<Redemption[]> {
    const { data } = await supabase
      .from('redemptions')
      .select('*, reward:rewards(*)')
      .eq('user_id', userId)
      .order('redeemed_at', { ascending: false });

    return data || [];
  },
};

function generateRedemptionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'FR-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
