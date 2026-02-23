# Hidden Warrior Game

A full-featured interactive game application with Solana wallet authentication, built on Next.js with modern web technologies.

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production version
npm run start
```

The application will be available at: **http://localhost:3000**

## Features

### Authentication
- **Solana Wallet** - Connect Phantom, Solflare and other wallets
- **Server Authentication** - JWT tokens via API server
- **Player Statistics** - Synchronized data with server

### Main Menu
- **Wallet Connection** - Connect Solana wallet for authentication
- **Player Stats** - Display player level, Shadow Glory, rank
- **Settings** - Sound, music and visual effects configuration

### Game Scene (Warrior Forge)
- Create new warriors with stat distribution (20 points)
- Collection of created warriors with statistics display
- Local data storage in browser (as in original)

### State Management
- Local warrior storage in browser localStorage
- State synchronization between all scenes
- Application settings (sound, effects)

### Battle Arena
- **PVE Battles** - Fight against AI opponents
- **PvP Battles** - Real-time player vs player combat
- **Weekly Battles** - Limited attempts with special rewards
- **Battle History** - Live feed of recent battles
- **Leaderboards** - Overall and weekly rankings

### Guild System
- Create and manage guilds
- Guild treasury and voting system
- Member roles and permissions
- Guild invitations and management

### Notification System
- Real-time notifications via WebSocket
- Weekly battle results
- Event announcements
- Guild notifications
- Achievement unlocks
- System messages

### Events System
- Tournament events
- Boss raids
- Daily quests
- Archetype mastery challenges
- Shadow Glory rush events

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main page with routing
│   ├── globals.css        # Global styles
│   └── api/               # API routes
│       ├── battles/       # Battle endpoints
│       ├── guilds/        # Guild endpoints
│       ├── leaderboard/   # Leaderboard endpoints
│       └── notifications/ # Notification endpoints
├── components/            # React components
│   ├── GameMenu.tsx       # Main menu with wallet connection
│   ├── GameScene.tsx      # Game scene (Warrior Forge)
│   ├── ArenaScene.tsx     # Battle arena scene
│   ├── GuildsScene.tsx    # Guild management scene
│   ├── ProfileScene.tsx   # Player profile scene
│   ├── NotificationBell.tsx # Notification system
│   ├── WalletContextProvider.tsx # Solana wallet provider
│   └── Modals.tsx         # Settings modals
├── contexts/              # React contexts
│   ├── AuthContext.tsx    # Server authentication
│   ├── NotificationContext.tsx # Notification management
│   ├── PvPContext.tsx     # PvP battle context
│   └── GuildToastContext.tsx # Guild notifications
├── store/                 # State management
│   ├── gameStore.ts       # Zustand store for settings
│   └── eventStore.ts      # Event management store
├── lib/                   # Utilities and API
│   ├── apiClient.ts       # Server request client
│   └── authMiddleware.ts  # Authentication middleware
├── types/                 # TypeScript types
│   ├── game.ts           # Game data types
│   ├── battle.ts         # Battle types
│   ├── guild.ts          # Guild types
│   ├── notification.ts   # Notification types
│   └── events.ts         # Event types
├── hooks/                 # Custom hooks
│   ├── useBattleSocket.ts # Battle WebSocket
│   ├── useBattleSpirit.ts # Battle Spirit management
│   ├── useNotificationSocket.ts # Notification WebSocket
│   ├── useEventProgress.ts # Event progress tracking
│   └── useSound.ts       # Sound effects
└── utils/                 # Utility functions
    ├── battleUtils.ts    # Battle calculations
    ├── arciumUtils.ts    # Arcium integration
    └── warriorNames.ts   # Warrior name generation
```

## Design System

The application uses a pixel-art design inspired by retro gaming:
- Retro colors and fonts (Departure Mono)
- Pixel-art buttons and UI elements
- Animations using Framer Motion
- Responsive design for mobile devices
- Console-style interface with CRT effects

## Technologies

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Full type safety
- **Zustand** - State management for settings
- **Solana Wallet Adapter** - Solana wallet integration
- **Framer Motion** - Smooth animations
- **Tailwind CSS** - Styling with custom colors
- **Lucide React** - UI icons
- **Socket.IO** - Real-time WebSocket communication
- **Prisma** - Database ORM (backend)
- **PostgreSQL** - Database (backend)

## Project Structure

The project is located in the `game/` folder next to the original `app/` for independent development. All code is written in English.

## Key Features

### Weekly Battle System
- 3 weekly battle attempts (resets Monday 00:00 UTC)
- Special rewards and leaderboard rankings
- Automatic notification on Monday with results

### Battle Spirit System
- Regenerates 5 points per hour
- Required for PVE battles
- Visual indicator with countdown

### Guild System
- Create and join guilds
- Treasury management with voting
- Member roles (Leader, Officer, Member)
- Guild proposals and voting system

### Event System
- Multiple event types (Tournament, Boss Raid, etc.)
- Event-specific rewards
- Progress tracking and leaderboards
- Automatic event participation

### Notification System
- Real-time notifications via WebSocket
- Bell icon with unread count badge
- Dropdown preview of recent notifications
- Different notification types with icons
- Mark as read / delete functionality

## Backend Integration

The frontend connects to a separate backend API:
- **API URL**: Configured via `NEXT_PUBLIC_API_URL`
- **WebSocket URL**: Configured via `NEXT_PUBLIC_BACKEND_WS_URL`
- **Authentication**: JWT tokens stored in localStorage
- **Real-time**: Socket.IO for live updates

## Development

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_BACKEND_WS_URL=http://localhost:3001
```

### Code Style

- All code in English
- TypeScript strict mode
- ESLint configuration
- No emojis in code or documentation
- Professional naming conventions

## Next Steps

1. **PWA Functionality** - Offline support and install as app
2. **Mobile Optimization** - Enhanced mobile experience
3. **Advanced Battle Mechanics** - More strategic depth
4. **NFT Integration** - Solana NFT support
5. **Additional Events** - More event types and challenges

## Data Storage

- **Warriors** stored locally in browser localStorage
- **Player Statistics** synchronized with server via authentication
- **Settings** saved locally in Zustand store
- **Notifications** stored in backend database with WebSocket updates

## Project Goals

Create a full-featured interactive game application with Solana wallet authentication, local data storage, server statistics, real-time features, and a complete notification system, maintaining the architecture of the original Hidden Warrior while adding modern features.

## License

Private project - All rights reserved
