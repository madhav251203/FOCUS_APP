import { SubscriptionPlan, SubscriptionTier } from '../types';

export const COLORS = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  primaryLight: '#8B85FF',
  secondary: '#FF6584',
  accent: '#43E97B',
  background: '#1A1A2E',
  backgroundLight: '#16213E',
  surface: '#0F3460',
  surfaceLight: '#1A4A7A',
  text: '#FFFFFF',
  textSecondary: '#B0B0C3',
  textMuted: '#6B6B80',
  success: '#43E97B',
  warning: '#FFD93D',
  error: '#FF6B6B',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const POINT_REWARDS: Record<number, number> = {
  10: 5,
  15: 8,
  20: 12,
  25: 16,
  30: 20,
  45: 35,
  60: 50,
  90: 80,
  120: 120,
};

export const MONTHLY_POINT_CAPS: Record<SubscriptionTier, number> = {
  free: 300,
  pro: 1000,
  plus: 2500,
  elite: 5000,
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    currency: '₹',
    monthlyPointsCap: 300,
    features: [
      'Basic focus timer',
      'Up to 300 points/month',
      'Basic analytics',
      'Daily streaks',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 99,
    currency: '₹',
    monthlyPointsCap: 1000,
    features: [
      'Everything in Free',
      'Up to 1,000 points/month',
      'Reward store access',
      'Detailed analytics',
      'Priority support',
    ],
  },
  {
    tier: 'plus',
    name: 'Plus',
    price: 199,
    currency: '₹',
    monthlyPointsCap: 2500,
    features: [
      'Everything in Pro',
      'Up to 2,500 points/month',
      'Exclusive rewards',
      'Leaderboard access',
      'Custom themes',
    ],
  },
  {
    tier: 'elite',
    name: 'Elite',
    price: 299,
    currency: '₹',
    monthlyPointsCap: 5000,
    features: [
      'Everything in Plus',
      'Up to 5,000 points/month',
      'Premium rewards',
      'Early access to features',
      'Personal focus coach',
    ],
  },
];

export const FOCUS_DURATIONS = [10, 15, 20, 25, 30, 45, 60, 90, 120];

export const STREAK_BONUS_POINTS: Record<number, number> = {
  7: 50,
  14: 120,
  30: 300,
  60: 700,
  90: 1200,
  365: 5000,
};

export const REFERRAL_BONUS_POINTS = 25;

export const MAX_APP_SWITCHES_ALLOWED = 2;
