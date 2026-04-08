import { supabase } from './supabase';
import { DailyAnalytics, LeaderboardEntry } from '../types';

export const analyticsService = {
  async getDailyAnalytics(userId: string, days = 30): Promise<DailyAnalytics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('focus_sessions')
      .select('started_at, duration_minutes, points_earned, status')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: true });

    if (!data) return [];

    const dailyMap = new Map<string, DailyAnalytics>();

    for (const session of data) {
      const date = session.started_at.split('T')[0];
      const existing = dailyMap.get(date) || {
        date,
        focus_minutes: 0,
        sessions_completed: 0,
        points_earned: 0,
      };

      existing.focus_minutes += session.duration_minutes;
      existing.sessions_completed += 1;
      existing.points_earned += session.points_earned;

      dailyMap.set(date, existing);
    }

    return Array.from(dailyMap.values());
  },

  async getWeeklyTotal(userId: string): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const { data } = await supabase
      .from('focus_sessions')
      .select('duration_minutes')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('started_at', startDate.toISOString());

    if (!data) return 0;
    return data.reduce((sum, s) => sum + s.duration_minutes, 0);
  },

  async getTodayTotal(userId: string): Promise<{ minutes: number; sessions: number; points: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('focus_sessions')
      .select('duration_minutes, points_earned')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('started_at', today.toISOString());

    if (!data || data.length === 0) return { minutes: 0, sessions: 0, points: 0 };

    return {
      minutes: data.reduce((sum, s) => sum + s.duration_minutes, 0),
      sessions: data.length,
      points: data.reduce((sum, s) => sum + s.points_earned, 0),
    };
  },

  async getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
    const { data } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, total_focus_minutes, current_streak')
      .order('total_focus_minutes', { ascending: false })
      .limit(limit);

    if (!data) return [];

    return data.map((user, index) => ({
      user_id: user.id,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      total_focus_minutes: user.total_focus_minutes,
      current_streak: user.current_streak,
      rank: index + 1,
    }));
  },
};
