# FocusRewards

A reward-based focus app where users earn points for uninterrupted focus sessions and redeem them for rewards. Built with React Native (Expo) and Supabase.

## Features

### Core
- **Focus Timer** — 10min to 2hr sessions with background tracking
- **Cheat Detection** — Monitors app switches and screen-off events
- **Reward Economy** — Points earned based on session duration, monthly caps per subscription tier
- **Reward Store** — Redeem points for Amazon/Flipkart gift cards, discount coupons
- **Subscription Tiers** — Free, Pro (₹99), Plus (₹199), Elite (₹299)

### Bonus
- Daily streak rewards
- Leaderboard
- Referral system (both users earn 25 points)
- Push notifications

### Admin Panel (Web)
- Dashboard with user/revenue/session metrics
- Manage rewards (add/edit/enable/disable)
- User management (admin toggle)
- Abuse detection (suspicious sessions)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native (Expo SDK 52) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Admin Panel | React + Vite + TypeScript |
| Auth | Email OTP + Google Sign-In (via Supabase) |
| Navigation | React Navigation 7 |
| State | React Context API |

## Project Structure

```
FOCUS_APP/
├── App.tsx                    # App entry point
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── GradientCard.tsx
│   │   └── StatCard.tsx
│   ├── constants/             # App constants, colors, plans
│   ├── context/               # React contexts (Auth, Focus)
│   ├── hooks/                 # Custom hooks
│   ├── navigation/            # React Navigation setup
│   ├── screens/               # App screens
│   │   ├── HomeScreen.tsx     # Dashboard with stats
│   │   ├── TimerScreen.tsx    # Focus timer with cheat detection
│   │   ├── RewardsScreen.tsx  # Reward store + redemption history
│   │   ├── ProfileScreen.tsx  # Profile, subscriptions, leaderboard
│   │   └── LoginScreen.tsx    # Email OTP + Google auth
│   ├── services/              # Supabase API services
│   │   ├── supabase.ts        # Supabase client
│   │   ├── auth.ts            # Authentication
│   │   ├── focus.ts           # Focus sessions + points
│   │   ├── rewards.ts         # Rewards + redemptions
│   │   ├── analytics.ts       # Analytics + leaderboard
│   │   └── user.ts            # User profile + referrals
│   ├── types/                 # TypeScript interfaces
│   └── utils/                 # Formatters and helpers
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full database schema with RLS
├── admin-panel/               # Web admin dashboard
│   ├── src/
│   │   ├── App.tsx            # Admin dashboard UI
│   │   ├── main.tsx           # Entry point
│   │   └── supabase.ts        # Admin Supabase client
│   └── package.json
├── app.json                   # Expo config
├── eas.json                   # EAS Build config
└── package.json
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Clone and Install

```bash
git clone https://github.com/madhav251203/FOCUS_APP.git
cd FOCUS_APP
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration in the Supabase SQL Editor:
   - Open `supabase/migrations/001_initial_schema.sql`
   - Paste and run in the SQL Editor
3. Enable Email OTP auth in Supabase Dashboard → Authentication → Providers
4. (Optional) Enable Google Auth provider

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
```

### 4. Run the App

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator.

### 5. Admin Panel Setup

```bash
cd admin-panel
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY
npm run dev
```

## Deployment

### Android Build (APK)

```bash
npx eas build -p android --profile preview
```

### Android Build (AAB for Play Store)

```bash
npx eas build -p android --profile production
```

### Play Store Submission

```bash
npx eas submit -p android --profile production
```

### Required for Play Store
- Replace placeholder icons in `src/assets/` with your actual app icons:
  - `icon.png` — 1024x1024 app icon
  - `adaptive-icon.png` — 1024x1024 adaptive icon foreground
  - `splash.png` — 1284x2778 splash screen
  - `favicon.png` — 48x48 web favicon
  - `notification-icon.png` — 96x96 notification icon (white on transparent)
- Update `app.json` with your EAS project ID
- Configure Google Play Billing or Razorpay for subscriptions

## Reward Economy

| Duration | Points |
|----------|--------|
| 10 min   | 5      |
| 15 min   | 8      |
| 20 min   | 12     |
| 25 min   | 16     |
| 30 min   | 20     |
| 45 min   | 35     |
| 60 min   | 50     |
| 90 min   | 80     |
| 120 min  | 120    |

### Monthly Caps

| Plan  | Price    | Monthly Cap |
|-------|----------|-------------|
| Free  | ₹0      | 300 pts     |
| Pro   | ₹99/mo  | 1,000 pts   |
| Plus  | ₹199/mo | 2,500 pts   |
| Elite | ₹299/mo | 5,000 pts   |

## Security

- **Row Level Security (RLS)** on all tables — users can only access their own data
- **Server-side point validation** — points calculated on backend, not client
- **Cheat detection** — app switches and screen-off events tracked
- **Monthly caps** enforced server-side to prevent exploitation
- **Service role key** only used in admin panel (never in mobile app)

## Test Credentials

After running the migration, sign up with any email to create an account. The OTP will be sent to your email if Supabase email is configured, or you can use Supabase's test OTP feature in development.

## License

MIT
