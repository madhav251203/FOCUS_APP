import { supabase } from './supabase';
import { FocusSession, FocusSessionStatus } from '../types';
import { POINT_REWARDS, MAX_APP_SWITCHES_ALLOWED, MONTHLY_POINT_CAPS } from '../constants';

function calculatePoints(durationMinutes: number): number {
  const durations = Object.keys(POINT_REWARDS)
    .map(Number)
    .sort((a, b) => b - a);
  for (const dur of durations) {
    if (durationMinutes >= dur) {
      return POINT_REWARDS[dur];
    }
  }
  return 0;
}

export const focusService = {
  async startSession(userId: string, durationMinutes: number): Promise<{ session: FocusSession | null; error: string | null }> {
    const { data: activeSession } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (activeSession) {
      return { session: null, error: 'You already have an active focus session' };
    }

    const { data, error } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: userId,
        duration_minutes: durationMinutes,
        started_at: new Date().toISOString(),
        status: 'active' as FocusSessionStatus,
        points_earned: 0,
        cheat_detected: false,
        app_switches: 0,
        screen_offs: 0,
      })
      .select()
      .single();

    if (error) return { session: null, error: error.message };
    return { session: data, error: null };
  },

  async completeSession(
    sessionId: string,
    userId: string,
    appSwitches: number,
    screenOffs: number
  ): Promise<{ points: number; error: string | null }> {
    const cheatDetected = appSwitches > MAX_APP_SWITCHES_ALLOWED || screenOffs > 1;

    const { data: session } = await supabase
      .from('focus_sessions')
      .select('duration_minutes')
      .eq('id', sessionId)
      .single();

    if (!session) return { points: 0, error: 'Session not found' };

    let pointsEarned = 0;

    if (!cheatDetected) {
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier, monthly_points_earned, monthly_points_reset_date')
        .eq('id', userId)
        .single();

      if (user) {
        const now = new Date();
        const resetDate = new Date(user.monthly_points_reset_date);
        let monthlyEarned = user.monthly_points_earned;

        if (now > resetDate) {
          monthlyEarned = 0;
          const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          await supabase
            .from('users')
            .update({
              monthly_points_earned: 0,
              monthly_points_reset_date: nextReset.toISOString(),
            })
            .eq('id', userId);
        }

        const cap = MONTHLY_POINT_CAPS[user.subscription_tier as keyof typeof MONTHLY_POINT_CAPS];
        const rawPoints = calculatePoints(session.duration_minutes);
        pointsEarned = Math.min(rawPoints, cap - monthlyEarned);
        pointsEarned = Math.max(0, pointsEarned);
      }
    }

    const { error } = await supabase
      .from('focus_sessions')
      .update({
        status: cheatDetected ? 'failed' : 'completed',
        ended_at: new Date().toISOString(),
        points_earned: pointsEarned,
        cheat_detected: cheatDetected,
        cheat_reason: cheatDetected
          ? `App switches: ${appSwitches}, Screen offs: ${screenOffs}`
          : null,
        app_switches: appSwitches,
        screen_offs: screenOffs,
      })
      .eq('id', sessionId);

    if (error) return { points: 0, error: error.message };

    if (pointsEarned > 0) {
      await supabase.rpc('add_points', {
        p_user_id: userId,
        p_points: pointsEarned,
      });
    }

    if (!cheatDetected) {
      await supabase.rpc('update_streak', { p_user_id: userId });
    }

    return { points: pointsEarned, error: null };
  },

  async cancelSession(sessionId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('focus_sessions')
      .update({
        status: 'cancelled' as FocusSessionStatus,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return { error: error?.message || null };
  },

  async getSessionHistory(userId: string, limit = 20): Promise<FocusSession[]> {
    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  },

  async getActiveSession(userId: string): Promise<FocusSession | null> {
    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return data;
  },
};
