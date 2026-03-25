# Red String Research

A visual investigation canvas app for mapping relationships, evidence, and connections using a corkboard-style interface with red string connections.

## Features

### Investigations Dashboard (Tab 1)
- Create and manage multiple investigations
- View investigation cards with node/string counts
- Swipe-to-delete with undo toast
- Sorted by most recently updated
- Demo mode with pre-loaded "Operation: Shadow Network" investigation
- 18-step guided tour for new users
- Subscription tier management (Free / Pro / Plus)
- COLLAB button in header navigates to collaboration sessions screen
- WAR ROOM button in header opens live video war room (requires Daily.co API key — see SETUP.md)

### Visual Investigation Canvas (Tab 2)
- Pannable and zoomable corkboard canvas
- Draggable pushpin-style node cards with drag-to-trash
- Multiple node types: Note, Link, Image, Folder, Dataset
- Image nodes render thumbnail preview in card
- Long-press Image in Add Node menu offers Camera vs Photo Library
- HamburgerButton in canvas header opens global app menu
- Bezier red string connections with custom colors and labels (fixed SVG re-render on pan/zoom)
- Connect mode for creating connections (fixed stale closure bug)
- Automation engine: auto-tags nodes by keyword, auto-connects related nodes
- Mind map view alternative
- Timeline panel for chronological events
- Color legend for node categorization
- Source attribution tracking per node
- Collaboration sessions

### Scripts & Templates (Tab 3)
- Pre-built investigation script templates
- Categories: Interview, FOIA, Source Contact, Evidence, Custom
- Variable substitution with live preview
- FOIA request templates, whistleblower contact scripts, interview scripts
- Create and edit custom scripts

### Live & Podcasts (Tab 4)
- Track investigation/journalism podcasts
- Live feed monitoring with LIVE indicators
- Social media keyword monitoring
- Pin content to investigation board

### AI Research Assistant (Tab 5)
- Real AI chat powered by OpenAI GPT-4o-mini via backend
- Full conversation history sent with each message for context
- Voice input with listening animation (UX ready)
- Quick action chips: Analyze Evidence, Find Connections, Research Topic, Summarize Case
- **Highlight & Categorize system**: long-press any AI message to assign a color category
  - Red = Critical Evidence, Amber = Key Lead, Green = Confirmed Fact
  - Blue = Background Info, Purple = Suspect/Person, Orange = Timeline Event
- Auto-tag generation on highlighted messages
- Highlights panel showing all tagged excerpts
- New Conversation button with confirmation guard
- Pin AI responses to investigation board

### Bookmarks & Import (Tab 6)
- Import bookmarks from X/Twitter, browsers, Pocket, Instapaper
- Filter by type: Articles, Tweets, Videos, PDFs
- Search imported bookmarks
- Add bookmarks directly to investigations as notes or links
- Social sign-in (Google/Apple) — UI ready, coming soon

### Authentication
- Phone number OTP authentication via Better Auth
- Social sign-in options (Google/Apple) on sign-in screen

### Tips System
- Public tip submission form
- Tip inbox with vetting scores
- Conversation threads with tipsters

## Navigation

```
(tabs)/
  index.tsx         — Investigations Dashboard
  two.tsx           — Investigation Canvas
  scripts.tsx       — Scripts & Templates
  podcast.tsx       — Live & Podcasts
  ai-research.tsx   — AI Research Assistant
  bookmarks.tsx     — Bookmarks & Import
```

## Architecture

### Mobile (`/mobile`)
- Expo SDK 53 + React Native
- Expo Router for file-based navigation
- Zustand for state management (persisted to AsyncStorage)
- NativeWind (Tailwind CSS) for styling
- react-native-gesture-handler for canvas interactions
- react-native-reanimated for animations
- react-native-svg for string connections
- @gorhom/bottom-sheet for node details

### Backend (`/backend`)
- Hono web framework on Bun
- Better Auth for phone OTP authentication
- Prisma + SQLite database

## Color Palette
- Background: `#1A1614` (deep warm charcoal)
- Surface: `#231F1C` (dark cork)
- Card: `#F5ECD7` (warm cream)
- Red Accent: `#C41E3A` (classic red string)
- Pin: `#D4A574` (amber pushpin)
- Text Light: `#E8DCC8`
- Muted: `#6B5B4F`
- Border: `#3D332C`
