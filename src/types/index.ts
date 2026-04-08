export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  total_focus_minutes: number;
  monthly_points_earned: number;
  monthly_points_reset_date: string;
  referral_code: string;
  referred_by: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'plus' | 'elite';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  monthlyPointsCap: number;
  features: string[];
}

export interface FocusSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  status: FocusSessionStatus;
  points_earned: number;
  cheat_detected: boolean;
  cheat_reason: string | null;
  app_switches: number;
  screen_offs: number;
  created_at: string;
}

export type FocusSessionStatus = 'active' | 'completed' | 'failed' | 'cancelled';

export interface Reward {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  category: RewardCategory;
  points_cost: number;
  stock: number;
  is_active: boolean;
  created_at: string;
}

export type RewardCategory = 'gift_card' | 'discount_coupon' | 'premium_feature';

export interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: RedemptionStatus;
  redemption_code: string | null;
  redeemed_at: string;
  reward?: Reward;
}

export type RedemptionStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_focus_minutes: number;
  current_streak: number;
  rank: number;
}

export interface DailyAnalytics {
  date: string;
  focus_minutes: number;
  sessions_completed: number;
  points_earned: number;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  bonus_points: number;
  created_at: string;
}
