import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalSessions: number;
  totalRedemptions: number;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  subscription_tier: string;
  total_points: number;
  current_streak: number;
  total_focus_minutes: number;
  is_admin: boolean;
  created_at: string;
}

interface RewardRow {
  id: string;
  name: string;
  description: string;
  category: string;
  points_cost: number;
  stock: number;
  is_active: boolean;
}

interface SuspiciousSession {
  id: string;
  user_id: string;
  user_email?: string;
  duration_minutes: number;
  app_switches: number;
  screen_offs: number;
  cheat_detected: boolean;
  started_at: string;
}

type Tab = 'dashboard' | 'users' | 'rewards' | 'abuse';

export function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalSessions: 0,
    totalRedemptions: 0,
  });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [suspicious, setSuspicious] = useState<SuspiciousSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Reward form state
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardRow | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    category: 'gift_card',
    points_cost: 100,
    stock: 50,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      // Race queries against a timeout so the UI renders even without a backend
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase request timeout')), 5000)
      );

      const [usersRes, sessionsRes, redemptionsRes, rewardsRes, subsRes] = await Promise.race([
        Promise.all([
          supabase.from('users').select('*').order('created_at', { ascending: false }),
          supabase.from('focus_sessions').select('id, user_id, duration_minutes, app_switches, screen_offs, cheat_detected, started_at, status'),
          supabase.from('redemptions').select('*'),
          supabase.from('rewards').select('*').order('points_cost', { ascending: true }),
          supabase.from('subscriptions').select('amount, status'),
        ]),
        timeout,
      ]);

      const allUsers = usersRes.data || [];
      const allSessions = sessionsRes.data || [];
      const allRedemptions = redemptionsRes.data || [];
      const allRewards = rewardsRes.data || [];
      const allSubs = subsRes.data || [];

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const activeUsers = allUsers.filter(
        (u) => new Date(u.updated_at || u.created_at) > weekAgo
      ).length;

      const totalRevenue = allSubs
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => sum + (s.amount || 0), 0);

      setStats({
        totalUsers: allUsers.length,
        activeUsers,
        totalRevenue,
        totalSessions: allSessions.length,
        totalRedemptions: allRedemptions.length,
      });

      setUsers(allUsers);
      setRewards(allRewards);

      // Find suspicious sessions (high app switches or screen offs)
      const suspiciousSessions = allSessions
        .filter((s) => s.app_switches > 2 || s.screen_offs > 1 || s.cheat_detected)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        .slice(0, 50)
        .map((s) => {
          const user = allUsers.find((u) => u.id === s.user_id);
          return { ...s, user_email: user?.email };
        });

      setSuspicious(suspiciousSessions);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReward = async () => {
    if (editingReward) {
      await supabase.from('rewards').update(rewardForm).eq('id', editingReward.id);
    } else {
      await supabase.from('rewards').insert(rewardForm);
    }
    setShowRewardForm(false);
    setEditingReward(null);
    setRewardForm({ name: '', description: '', category: 'gift_card', points_cost: 100, stock: 50, is_active: true });
    await loadData();
  };

  const handleEditReward = (reward: RewardRow) => {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name,
      description: reward.description,
      category: reward.category,
      points_cost: reward.points_cost,
      stock: reward.stock,
      is_active: reward.is_active,
    });
    setShowRewardForm(true);
  };

  const handleToggleReward = async (reward: RewardRow) => {
    await supabase.from('rewards').update({ is_active: !reward.is_active }).eq('id', reward.id);
    await loadData();
  };

  const handleToggleAdmin = async (user: UserRow) => {
    await supabase.from('users').update({ is_admin: !user.is_admin }).eq('id', user.id);
    await loadData();
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
  };

  const sidebarStyle: React.CSSProperties = {
    width: 240,
    background: '#1e293b',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    padding: 32,
    overflowY: 'auto',
  };

  const navButtonStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#6366f1' : 'transparent',
    color: active ? '#fff' : '#94a3b8',
    border: 'none',
    padding: '10px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
  });

  const cardStyle: React.CSSProperties = {
    background: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  };

  const statGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24,
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #334155',
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #1e293b',
    fontSize: 13,
  };

  const inputStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#e2e8f0',
    fontSize: 14,
    width: '100%',
  };

  const buttonStyle: React.CSSProperties = {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <h2 style={{ color: '#818cf8', fontSize: 18, marginBottom: 24 }}>
          FocusRewards Admin
        </h2>
        {(['dashboard', 'users', 'rewards', 'abuse'] as Tab[]).map((t) => (
          <button key={t} style={navButtonStyle(tab === t)} onClick={() => setTab(t)}>
            {t === 'dashboard' && '📊 '}
            {t === 'users' && '👥 '}
            {t === 'rewards' && '🎁 '}
            {t === 'abuse' && '🛡️ '}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={{ ...navButtonStyle(false), marginTop: 'auto' }} onClick={loadData}>
          🔄 Refresh
        </button>
      </div>

      {/* Main Content */}
      <div style={mainStyle}>
        {tab === 'dashboard' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>

            <div style={statGridStyle}>
              {[
                { label: 'Total Users', value: stats.totalUsers, color: '#818cf8' },
                { label: 'Active Users (7d)', value: stats.activeUsers, color: '#34d399' },
                { label: 'Revenue (₹)', value: `₹${stats.totalRevenue.toLocaleString()}`, color: '#fbbf24' },
                { label: 'Total Sessions', value: stats.totalSessions, color: '#60a5fa' },
                { label: 'Redemptions', value: stats.totalRedemptions, color: '#f472b6' },
              ].map((stat) => (
                <div key={stat.label} style={cardStyle}>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{stat.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <h3 style={{ marginBottom: 12 }}>Recent Users</h3>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Plan</th>
                    <th style={thStyle}>Points</th>
                    <th style={thStyle}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 10).map((u) => (
                    <tr key={u.id}>
                      <td style={tdStyle}>{u.display_name}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>
                        <span style={{
                          background: u.subscription_tier === 'free' ? '#334155' : '#6366f120',
                          color: u.subscription_tier === 'free' ? '#94a3b8' : '#818cf8',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}>
                          {u.subscription_tier}
                        </span>
                      </td>
                      <td style={tdStyle}>{u.total_points}</td>
                      <td style={tdStyle}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Users ({users.length})</h1>
            <div style={cardStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Plan</th>
                    <th style={thStyle}>Points</th>
                    <th style={thStyle}>Streak</th>
                    <th style={thStyle}>Focus (min)</th>
                    <th style={thStyle}>Admin</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={tdStyle}>{u.display_name}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>{u.subscription_tier}</td>
                      <td style={tdStyle}>{u.total_points}</td>
                      <td style={tdStyle}>{u.current_streak}d</td>
                      <td style={tdStyle}>{u.total_focus_minutes}</td>
                      <td style={tdStyle}>{u.is_admin ? 'Yes' : 'No'}</td>
                      <td style={tdStyle}>
                        <button
                          style={{ ...buttonStyle, background: u.is_admin ? '#ef4444' : '#22c55e', fontSize: 11, padding: '4px 8px' }}
                          onClick={() => handleToggleAdmin(u)}
                        >
                          {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'rewards' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>Rewards ({rewards.length})</h1>
              <button
                style={buttonStyle}
                onClick={() => {
                  setEditingReward(null);
                  setRewardForm({ name: '', description: '', category: 'gift_card', points_cost: 100, stock: 50, is_active: true });
                  setShowRewardForm(true);
                }}
              >
                + Add Reward
              </button>
            </div>

            {showRewardForm && (
              <div style={{ ...cardStyle, border: '1px solid #6366f1' }}>
                <h3 style={{ marginBottom: 16 }}>{editingReward ? 'Edit Reward' : 'New Reward'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8' }}>Name</label>
                    <input
                      style={inputStyle}
                      value={rewardForm.name}
                      onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8' }}>Category</label>
                    <select
                      style={inputStyle}
                      value={rewardForm.category}
                      onChange={(e) => setRewardForm({ ...rewardForm, category: e.target.value })}
                    >
                      <option value="gift_card">Gift Card</option>
                      <option value="discount_coupon">Discount Coupon</option>
                      <option value="premium_feature">Premium Feature</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, color: '#94a3b8' }}>Description</label>
                    <input
                      style={inputStyle}
                      value={rewardForm.description}
                      onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8' }}>Points Cost</label>
                    <input
                      style={inputStyle}
                      type="number"
                      value={rewardForm.points_cost}
                      onChange={(e) => setRewardForm({ ...rewardForm, points_cost: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#94a3b8' }}>Stock</label>
                    <input
                      style={inputStyle}
                      type="number"
                      value={rewardForm.stock}
                      onChange={(e) => setRewardForm({ ...rewardForm, stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button style={buttonStyle} onClick={handleSaveReward}>Save</button>
                  <button style={{ ...buttonStyle, background: '#475569' }} onClick={() => setShowRewardForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div style={cardStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Points</th>
                    <th style={thStyle}>Stock</th>
                    <th style={thStyle}>Active</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((r) => (
                    <tr key={r.id}>
                      <td style={tdStyle}>{r.name}</td>
                      <td style={tdStyle}>{r.category.replace('_', ' ')}</td>
                      <td style={tdStyle}>{r.points_cost}</td>
                      <td style={tdStyle}>{r.stock}</td>
                      <td style={tdStyle}>
                        <span style={{
                          color: r.is_active ? '#34d399' : '#ef4444',
                          fontWeight: 600,
                        }}>
                          {r.is_active ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            style={{ ...buttonStyle, fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleEditReward(r)}
                          >
                            Edit
                          </button>
                          <button
                            style={{ ...buttonStyle, fontSize: 11, padding: '4px 8px', background: r.is_active ? '#ef4444' : '#22c55e' }}
                            onClick={() => handleToggleReward(r)}
                          >
                            {r.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'abuse' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Abuse Detection</h1>

            <div style={cardStyle}>
              <h3 style={{ marginBottom: 12 }}>Suspicious Sessions ({suspicious.length})</h3>
              {suspicious.length === 0 ? (
                <p style={{ color: '#94a3b8', padding: 20, textAlign: 'center' }}>
                  No suspicious sessions detected
                </p>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>User</th>
                      <th style={thStyle}>Duration</th>
                      <th style={thStyle}>App Switches</th>
                      <th style={thStyle}>Screen Offs</th>
                      <th style={thStyle}>Cheat Detected</th>
                      <th style={thStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suspicious.map((s) => (
                      <tr key={s.id}>
                        <td style={tdStyle}>{s.user_email || s.user_id.slice(0, 8)}</td>
                        <td style={tdStyle}>{s.duration_minutes} min</td>
                        <td style={{ ...tdStyle, color: s.app_switches > 2 ? '#ef4444' : '#e2e8f0' }}>
                          {s.app_switches}
                        </td>
                        <td style={{ ...tdStyle, color: s.screen_offs > 1 ? '#ef4444' : '#e2e8f0' }}>
                          {s.screen_offs}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ color: s.cheat_detected ? '#ef4444' : '#34d399' }}>
                            {s.cheat_detected ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={tdStyle}>{new Date(s.started_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
