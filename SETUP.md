# Setup Guide

## War Room (Live Video Collaboration)

The War Room feature enables live video calls with investigation board sharing, chat, and node data requests between investigators. It uses [Daily.co](https://daily.co) for WebRTC video infrastructure.

### Step 1: Create a Daily.co account

1. Go to [https://daily.co](https://daily.co) and sign up for a free account.
2. The free tier supports up to 40 minutes per call and 4 participants — sufficient for development and testing.

### Step 2: Get your API key

1. In the Daily.co dashboard, go to **Developers** → **API keys**.
2. Click **Create new API key** and give it a name (e.g. "Red String").
3. Copy the key value.

### Step 3: Add the key to your backend

Open `backend/.env` and add:

```
DAILY_API_KEY=your_key_here
```

### Step 4: Restart the backend

The backend will pick up the new key on next start. If using Vibecode, the server restarts automatically when `.env` changes.

### Without a Daily.co key

If `DAILY_API_KEY` is not set, the War Room feature shows a friendly error message — **"War Room requires Daily.co setup — contact your admin"** — instead of crashing. All other app features continue to work normally.

### War Room features

- Live video call (camera + microphone) via Daily.co WebRTC
- Read-only investigation board visible to all participants
- Pan/zoom the corkboard to navigate evidence
- Non-owner participants can tap **Request** on any node to ask the owner to share it
- Owner sees incoming requests with Approve / Decline actions; approved nodes are added to the requester's investigation with source attribution
- Group chat with file sharing (documents, images)
- Private notes scratchpad (never shared automatically; "Share Note" sends it to chat)
- Participants panel showing mic/camera status
- Owner can end the session; participants can leave at any time
- Rooms expire automatically after 2 hours
