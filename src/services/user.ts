import { supabase } from './supabase';
import { User, SubscriptionTier } from '../types';
import { REFERRAL_BONUS_POINTS } from '../constants';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const userService = {
  async getProfile(userId: string): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return data;
  },

  async createProfile(userId: string, email: string, displayName: string): Promise<User | null> {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        display_name: displayName || email.split('@')[0],
        subscription_tier: 'free' as SubscriptionTier,
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        total_focus_minutes: 0,
        monthly_points_earned: 0,
        monthly_points_reset_date: nextMonth.toISOString(),
        referral_code: generateReferralCode(),
        is_admin: false,
      })
      .select()
      .single();

    return data;
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return { error: error?.message || null };
  },

  async updateSubscription(userId: string, tier: SubscriptionTier): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return { error: error?.message || null };
  },

  async applyReferralCode(userId: string, referralCode: string): Promise<{ error: string | null }> {
    const { data: referrer } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (!referrer) return { error: 'Invalid referral code' };
    if (referrer.id === userId) return { error: 'You cannot refer yourself' };

    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', userId)
      .single();

    if (existingReferral) return { error: 'You have already used a referral code' };

    await supabase.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: userId,
      bonus_points: REFERRAL_BONUS_POINTS,
    });

    await supabase.rpc('add_points', {
      p_user_id: referrer.id,
      p_points: REFERRAL_BONUS_POINTS,
    });

    await supabase.rpc('add_points', {
      p_user_id: userId,
      p_points: REFERRAL_BONUS_POINTS,
    });

    await supabase
      .from('users')
      .update({ referred_by: referralCode })
      .eq('id', userId);

    return { error: null };
  },
};
