# Red String Research

A visual investigation canvas app for mapping relationships, evidence, and connections using a corkboard-style interface with red string connections.

## Features

### Investigations Dashboard
- Create and manage multiple investigations
- View investigation cards with node/string counts
- Delete investigations with confirmation
- Sorted by most recently updated

### Visual Investigation Canvas
- Pannable and zoomable corkboard canvas
- Draggable pushpin-style node cards
- Multiple node types: Note, Link, Image, Folder, Dataset
- Red string connections between any two nodes
- Connect mode toggle for creating connections
- Node detail bottom sheet for editing
- Add nodes at canvas center

### Node System
- Each node appears as a cream-colored pushpin card
- Color-coded pushpin dots
- Tag support with color coding
- Editable title and content

### Red String Connections
- Draw red string connections between any nodes
- Connection labels
- Visual endpoint circles
- Midpoint label display
- Delete connections from node detail view

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
- Health check endpoint

## Color Palette
- Background: `#1A1614` (deep warm charcoal)
- Surface: `#231F1C` (dark cork)
- Card: `#F5ECD7` (warm cream)
- Red Accent: `#C41E3A` (classic red string)
- Pin: `#D4A574` (amber pushpin)
- Text Light: `#E8DCC8`
- Muted: `#6B5B4F`
- Border: `#3D332C`
