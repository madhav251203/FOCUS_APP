-- =============================================
-- FocusRewards Database Schema
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'plus', 'elite')),
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_focus_minutes INTEGER NOT NULL DEFAULT 0,
  monthly_points_earned INTEGER NOT NULL DEFAULT 0,
  monthly_points_reset_date TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  referral_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  referred_by TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- FOCUS SESSIONS TABLE
-- =============================================
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 10 AND duration_minutes <= 120),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  points_earned INTEGER NOT NULL DEFAULT 0,
  cheat_detected BOOLEAN NOT NULL DEFAULT FALSE,
  cheat_reason TEXT,
  app_switches INTEGER NOT NULL DEFAULT 0,
  screen_offs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_status ON focus_sessions(status);
CREATE INDEX idx_focus_sessions_started_at ON focus_sessions(started_at);

-- =============================================
-- REWARDS TABLE
-- =============================================
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'gift_card'
    CHECK (category IN ('gift_card', 'discount_coupon', 'premium_feature')),
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- REDEMPTIONS TABLE
-- =============================================
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id),
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  redemption_code TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redemptions_user_id ON redemptions(user_id);

-- =============================================
-- REFERRALS TABLE
-- =============================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_points INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- =============================================
-- SUBSCRIPTIONS TABLE (Payment tracking)
-- =============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'plus', 'elite')),
  payment_provider TEXT NOT NULL DEFAULT 'razorpay',
  payment_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'expired')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- =============================================
-- RPC FUNCTIONS
-- =============================================

-- Add points to user
CREATE OR REPLACE FUNCTION add_points(p_user_id UUID, p_points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET
    total_points = total_points + p_points,
    monthly_points_earned = monthly_points_earned + p_points,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct points from user
CREATE OR REPLACE FUNCTION deduct_points(p_user_id UUID, p_points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET
    total_points = GREATEST(total_points - p_points, 0),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  last_session_date DATE;
  today DATE := CURRENT_DATE;
BEGIN
  SELECT DATE(MAX(ended_at))
  INTO last_session_date
  FROM focus_sessions
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND DATE(ended_at) < today;

  IF last_session_date = today - INTERVAL '1 day' THEN
    -- Continue streak
    UPDATE users
    SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      updated_at = NOW()
    WHERE id = p_user_id;
  ELSIF last_session_date IS NULL OR last_session_date < today - INTERVAL '1 day' THEN
    -- Reset streak
    UPDATE users
    SET
      current_streak = 1,
      longest_streak = GREATEST(longest_streak, 1),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  -- If last_session_date = today, streak was already updated today
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update total focus minutes after session
CREATE OR REPLACE FUNCTION update_focus_minutes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE users
    SET
      total_focus_minutes = total_focus_minutes + NEW.duration_minutes,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_focus_minutes
  AFTER UPDATE OF status ON focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_focus_minutes();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users: can read own profile, update own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow reading other users for leaderboard (limited fields via service)
CREATE POLICY "Users can view leaderboard data"
  ON users FOR SELECT
  USING (TRUE);

-- Focus sessions: users can manage their own
CREATE POLICY "Users can view own sessions"
  ON focus_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create sessions"
  ON focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON focus_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Rewards: anyone can read active rewards
CREATE POLICY "Anyone can view active rewards"
  ON rewards FOR SELECT
  USING (is_active = TRUE);

-- Admins can manage rewards
CREATE POLICY "Admins can manage rewards"
  ON rewards FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Redemptions: users can view and create their own
CREATE POLICY "Users can view own redemptions"
  ON redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create redemptions"
  ON redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Referrals: users can view their own
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_id);

-- Subscriptions: users can view their own
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- SEED DATA: Sample Rewards
-- =============================================
INSERT INTO rewards (name, description, category, points_cost, stock) VALUES
  ('Amazon Gift Card ₹100', 'Amazon India ₹100 gift card', 'gift_card', 200, 50),
  ('Amazon Gift Card ₹500', 'Amazon India ₹500 gift card', 'gift_card', 900, 20),
  ('Flipkart Gift Card ₹100', 'Flipkart ₹100 gift card', 'gift_card', 200, 50),
  ('Flipkart Gift Card ₹500', 'Flipkart ₹500 gift card', 'gift_card', 900, 20),
  ('Swiggy 20% Off', '20% discount on your next Swiggy order (max ₹100)', 'discount_coupon', 80, 100),
  ('Zomato 15% Off', '15% discount on Zomato orders (max ₹75)', 'discount_coupon', 60, 100),
  ('Custom Theme Pack', 'Unlock exclusive dark & light themes', 'premium_feature', 150, 999),
  ('Profile Badge: Focus Master', 'Exclusive Focus Master badge for your profile', 'premium_feature', 100, 999);
