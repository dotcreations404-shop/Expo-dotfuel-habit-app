# DotFuel 🟢

**Your personal nutrition tracker — built for Indian athletes.**

Track calories, hit your macros, stay consistent. Built with Expo SDK 56 for iOS, Android, and Web.

## Features

- 🎯 **Fuel Score** — daily nutrition score (0-100) based on macro targets
- 📊 **Macro Tracking** — protein, carbs, fat with visual progress bars
- 💧 **Water Tracking** — quick-add buttons for hydration goals
- 🔥 **Streak System** — daily logging streaks with 7-day visualization
- 🤖 **Dot Boy AI** — personal AI trainer powered by Claude (streaming chat)
- 📸 **Photo AI** — snap a meal photo for instant macro estimation
- 🔍 **Food Search** — FatSecret database with 1M+ foods
- 📱 **Barcode Scanner** — scan product barcodes for instant lookup
- 🎙️ **Voice Logging** — say what you ate (coming soon)
- 🏆 **Challenges** — community challenges and leaderboards

## Tech Stack

- **Framework**: [Expo SDK 56](https://expo.dev) + React Native
- **Router**: [Expo Router](https://docs.expo.dev/router/introduction/) (file-based)
- **Backend**: [Supabase](https://supabase.com) (auth, database, storage)
- **AI**: [Anthropic Claude](https://anthropic.com) (food estimation, DotBoy chat)
- **Food Data**: [FatSecret API](https://platform.fatsecret.com)
- **TTS**: [ElevenLabs](https://elevenlabs.io)
- **Animations**: [Reanimated 3](https://docs.swmansion.com/react-native-reanimated/)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)

## Getting Started

### Prerequisites

- Node.js 22+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Setup

```bash
# Clone the repo
git clone https://github.com/dotcreations404/dotcreations404-shop.git
cd dotcreations404-shop

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your API keys in .env

# Start the dev server
npx expo start
```

### Environment Variables

See [`.env.example`](.env.example) for the required variables:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `FATSECRET_CLIENT_ID` | FatSecret OAuth client ID |
| `FATSECRET_CLIENT_SECRET` | FatSecret OAuth client secret |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API key |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Auth flow (login, onboarding)
│   ├── (tabs)/           # Main app tabs
│   │   ├── (home)/       # Dashboard
│   │   ├── (log)/        # Food logging
│   │   ├── (challenges)/ # DotBoy AI + challenges
│   │   └── (profile)/    # Settings + stats
│   ├── api/              # API routes (replaces Netlify Functions)
│   └── _layout.tsx       # Root layout
├── components/           # Reusable UI components
├── constants/            # Colors, spacing, typography
├── contexts/             # Auth context provider
└── lib/                  # Supabase client, types
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/ai-estimate` | POST | AI macro estimation from text/photos |
| `/api/fatsecret` | GET | Food search + barcode lookup |
| `/api/dotboy` | POST | Streaming AI chat (SSE) |
| `/api/dotboy-tts` | POST | Text-to-speech |
| `/api/ocr-label` | POST | Nutrition label OCR |
| `/api/delete-account` | POST | Full account deletion |

## Built By

**Dot Creations** — dotcreations404@gmail.com
