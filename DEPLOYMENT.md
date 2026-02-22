# Women Safety System - Deployment Guide

## Quick Start

### 1. Firebase Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize your project
firebase init

# Deploy database rules
firebase deploy --only database:rules
```

### 2. Environment Variables
Create `.env.local`:
```env
VITE_FIREBASE_API_KEY=AIzaSyD4H5GaqjIxMCQwIr1dE9elIM_sMGxNs1I
VITE_FIREBASE_AUTH_DOMAIN=nirbhaya-aeea4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nirbhaya-aeea4
VITE_FIREBASE_STORAGE_BUCKET=nirbhaya-aeea4.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=478442441771
VITE_FIREBASE_APP_ID=1:478442441771:web:5ecb1d01dbc5fa005b6e6e
```

### 3. Development
```bash
npm run dev
```

### 4. Production Build
```bash
npm run build
```

## Deployment Options

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy automatically

### Netlify
1. Push to GitHub
2. Connect repository to Netlify
3. Add environment variables
4. Deploy automatically

### Firebase Hosting
```bash
firebase deploy --only hosting
```

## Testing the System

1. **Create Test Accounts**:
   - Victim account: victim@test.com
   - Police account: police@test.com

2. **Test Victim Flow**:
   - Login as victim
   - Click SOS button
   - Allow camera/microphone
   - Verify live preview

3. **Test Police Flow**:
   - Login as police
   - View active sessions
   - Click to connect
   - Verify live stream

## Security Notes

- Always use HTTPS in production
- Enable Firebase security rules
- Monitor active sessions
- Regular security audits
