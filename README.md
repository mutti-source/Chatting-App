# ⚡ Electric Chat — Modern Real-Time Mobile Chat & Collaboration App

An enterprise-grade, high-performance mobile messaging and team collaboration application built with **React Native**, **Expo SDK 54**, **Expo Router**, **Firebase Cloud Firestore**, and **Cloudinary**. 

Featuring a dual-theme **Modern Dark** & **Electric Light** design system, voice notes, media sharing, group @mentions, Instagram-style **Message Requests**, push notifications, and Microsoft Teams & WhatsApp-style channel administration.

---

## 📱 Live Demo & Downloads

### 📥 Android Standalone APK
Download the compiled, installable `.apk` directly to your Android device:

[![Download APK](https://img.shields.io/badge/Download-Android_APK_v1.0.0-007AFF?style=for-the-badge&logo=android&logoColor=white)](https://expo.dev/artifacts/eas/T4zCa7RuyG-Ck4Qo13ncH3S7xeeoKfJXXYxBDhYtWYQ.apk)

> 🔗 **Direct APK Download Link:**  
> [https://expo.dev/artifacts/eas/T4zCa7RuyG-Ck4Qo13ncH3S7xeeoKfJXXYxBDhYtWYQ.apk](https://expo.dev/artifacts/eas/T4zCa7RuyG-Ck4Qo13ncH3S7xeeoKfJXXYxBDhYtWYQ.apk)

---

### 🎥 App Video Demo
> 📹 *Check out the walkthrough video demonstrating live messaging, voice notes, group admin delegation, message requests, and swipe gesture navigation:*

<!-- Replace the video link or GIF below with your uploaded demo video -->
[![Electric Chat Demo Video](https://img.shields.io/badge/Watch-App_Demo_Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://expo.dev/artifacts/eas/T4zCa7RuyG-Ck4Qo13ncH3S7xeeoKfJXXYxBDhYtWYQ.apk)

---

## 🔄 Complete App Workflow & User Journey

```mermaid
flowchart TD
    A[Launch App] --> B{Authenticated?}
    B -->|No| C[Login / Sign Up Screen]
    C -->|Register or Sign In| D[Main App Tab Navigation]
    B -->|Yes| D
    
    D --> E[Chats Tab]
    D --> F[Contacts Tab]
    D --> G[Profile Tab]
    
    E --> H[Direct Messages]
    E --> I[Group Channels]
    E --> J[Requests Inbox]
    
    F -->|Select User| K[Send Message Request]
    K -->|Pending Request| J
    J -->|Accept| H
    J -->|Decline| L[Request Dismissed]
    
    I -->|Open Channel| M[Chat Room Canvas]
    M --> N[Text & Media Sharing]
    M --> O[Audio Voice Notes]
    M --> P[@Mentions Suggestions]
    M --> Q[Group Settings & Admin Tools]
    
    Q --> R[Add Members with Chips]
    Q --> S[Promote to Group Admin]
    Q --> T[Toggle Broadcast Mode]
```

### 1. 🔐 Authentication & Onboarding
* **Sign Up / Registration**: Create an account with Full Name, Email, and Password. Automatically provisions user metadata in Firestore and creates default avatars.
* **Sign In**: Secure session authentication via Firebase Auth with auto-login and persistent local state.
* **Theme Preference**: Auto-detects device system theme with instant runtime switching between **Modern Dark** and **Electric Light** palettes.

### 2. 📬 Direct Messages & Message Requests Workflow
* **Discovery**: Browse registered users in the **Contacts** tab with search filtering by name, email, or phone.
* **Private Invitation**: Starting a chat with a new user initiates a **Message Request** (`status: 'PENDING'`).
* **Recipient Control**:
  * The message request does **not** clutter the recipient's primary Direct Chats list.
  * It appears in the dedicated **Requests** tab with sender profile info, last message preview, and one-tap **`[Accept]`** / **`[Decline]`** buttons.
  * When opening a pending request, an in-chat action banner allows reviewing the conversation before choosing to accept or decline.
* **Instant Activation**: Upon acceptance, the conversation seamlessly moves to **Direct Messages** for both participants.

### 3. 👥 Group Channels & Admin Delegation Workflow
* **Privacy & Membership Isolation**: Group channels are strictly private. Only the creator, administrators, and explicitly added members can see the group in their chat list or access messages.
* **Two Channel Modes**:
  * **`Everyone`**: Open collaboration where all channel members can send messages, audio, and images.
  * **`Admin Broadcast`**: Only administrators can post; general members participate in read-only mode.
* **Teams-Style Member Management**:
  * Search members across the organization.
  * Multi-select with interactive chips.
  * One-tap batch addition to channels.
* **👑 Group Admin Delegation**:
  * Group owners can promote any member to **Group Admin** (`Make Admin 👑`).
  * Group admins can manage members, change channel modes, edit group avatars/names, and delete inappropriate messages.

### 4. 🎙️ Rich Media, Voice Notes & @Mentions
* **Audio Voice Notes**: Native high-fidelity audio recorder powered by `expo-av`. Features live recording indicators, audio compression, Cloudinary upload, and custom interactive playback sliders.
* **Photo & Media Sharing**: Upload images from camera or gallery with instant fullscreen lightbox preview.
* **Smart Group @Mentions**:
  * Type `@` in any group to trigger autocomplete suggestions.
  * **Filtered to Group Members Only**: Excludes non-members and self.
  * Mentioned users receive high-priority in-app and push notification alerts.

### 5. 🔔 Notification Center
* Dedicated notification drawer tracking direct message requests, group mentions, and channel updates.
* Unread badge indicators and 1-tap **Read All** clearing.
* Tapping any notification deep-links directly into the respective chat room.

### 6. 👤 Profile & Social Connect
* Real-time profile photo updates synced across all chat headers and message bubbles.
* Configurable profile fields: **Full Name**, **Phone Number**, **Bio**, **LinkedIn URL**, and **GitHub / Portfolio URL**.
* Interactive 1-tap social buttons (Phone dialer, LinkedIn, GitHub).

---

## 🛠️ Technology Stack & Architecture

| Layer | Technologies Used |
|---|---|
| **Mobile Framework** | React Native (0.81), Expo SDK 54 |
| **Navigation & Routing** | Expo Router v6 (File-based native stack & tab navigation) |
| **Authentication** | Firebase Authentication (Email/Password) |
| **Database & Realtime Sync** | Firebase Cloud Firestore (Snapshot subscriptions & batch queries) |
| **Media Storage** | Cloudinary REST API (Unsigned upload presets for Images & Audio) |
| **Notifications** | `expo-notifications` with Firestore synchronization |
| **Audio Processing** | `expo-av`, `@react-native-community/slider` |
| **Gestures & Animations** | `react-native-gesture-handler`, `expo-haptics`, Native Stack Transitions |

---

## 🚀 Local Development Setup

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* [Expo Go app](https://expo.dev/go) on your physical device, or an Android/iOS Emulator

---

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/yourusername/ChatApp.git
cd ChatApp
npm install
```

---

### 3. Firebase Configuration

1. Visit the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Under **Build ➔ Authentication**, enable **Email/Password** sign-in.
3. Under **Build ➔ Firestore Database**, create a Firestore database.
4. Register a **Web App** in project settings to retrieve your API credentials.

#### 🛡️ Firestore Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    match /groups/{groupId} {
      allow read, write: if request.auth != null;
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
      match /typing/{userId} {
        allow read, write: if request.auth != null;
      }
    }
    match /direct_chats/{chatId} {
      allow read, write: if request.auth != null;
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null;
    }
    match /join_requests/{requestId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

### 4. Cloudinary Configuration (For Images & Voice Notes)

1. Create a free account on [Cloudinary](https://cloudinary.com/).
2. Navigate to **Settings ➔ Upload Presets**.
3. Create a new Upload Preset with **Signing Mode: Unsigned**.
4. Copy your **Cloud Name** and **Upload Preset Name**.

---

### 5. Configure Environment Variables

Create a `.env` file in the root directory (based on `.env.example`):

```bash
cp .env.example .env
```

Add your keys to `.env`:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
EXPO_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...

# Cloudinary Configuration
EXPO_PUBLIC_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_UPLOAD_PRESET=your_unsigned_preset
```

---

### 6. Start the App

```bash
npx expo start
```

* **Physical Device:** Open **Expo Go** on Android/iOS and scan the terminal QR code.
* **Android Emulator:** Press `a` in the terminal.
* **iOS Simulator:** Press `i` in the terminal.

---

## 📦 Building Standalone APK (Android)

To generate a standalone `.apk` for Android using Expo Application Services (EAS):

### 1. Install EAS CLI & Login
```bash
npm install -g eas-cli
eas login
```

### 2. Configure Build Secrets in `eas.json`
Make sure `eas.json` contains your Firebase and Cloudinary credentials in the `preview` profile:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "AIzaSy...",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "your-project.firebaseapp.com",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "your-project",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "your-project.firebasestorage.app",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "1234567890",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "1:1234567890:web:...",
        "EXPO_PUBLIC_CLOUD_NAME": "your_cloud_name",
        "EXPO_PUBLIC_UPLOAD_PRESET": "your_preset"
      }
    }
  }
}
```

### 3. Trigger the Cloud APK Build
```bash
eas build -p android --profile preview
```

Upon completion, EAS provides a direct link to download the installable `.apk`.

---

## 📁 Directory Structure

```
ChatApp/
├── src/
│   ├── app/                      # Expo Router navigation routes
│   │   ├── (auth)/               # Authentication stack (Login, Signup)
│   │   ├── (tabs)/               # Bottom tab navigator
│   │   │   ├── groups.tsx        # Messages, Groups & Requests inbox
│   │   │   ├── contacts.tsx      # Member directory & quick chat
│   │   │   ├── profile.tsx       # User profile, bio & theme settings
│   │   │   └── _layout.tsx       # Custom bottom tab bar with spring animations
│   │   ├── group/
│   │   │   ├── [id].tsx          # Real-time chat room (Direct & Group)
│   │   │   └── add-members.tsx   # Channel participant management & search
│   │   ├── notifications.tsx     # In-app notification drawer
│   │   └── _layout.tsx           # Global theme provider & native screen transitions
│   ├── components/
│   │   └── ui/                   # Reusable UI components
│   │       ├── ChatBubble.tsx    # Text, image, voice note & timestamp bubble
│   │       ├── ChatInput.tsx     # Rich input with mic, attachments & @mention popup
│   │       ├── GroupSettingsModal.tsx # Admin moderation drawer
│   │       ├── SwipeableTabWrapper.tsx # 120 FPS horizontal swipe navigation
│   │       └── TypingIndicator.tsx     # Animated typing bubbles
│   ├── context/
│   │   ├── AuthContext.tsx       # Firebase session & user state
│   │   └── ThemeContext.tsx      # Dark / Light theme tokens
│   ├── firebase/
│   │   ├── config.ts             # Firebase client setup
│   │   └── firestore.ts          # Realtime subscriptions & CRUD methods
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces (Message, Group, DirectChat)
│   └── utils/
│       ├── cloudinary.ts         # Direct image and audio upload service
│       └── notifications.ts      # Push notification token dispatcher
├── app.config.js                 # Dynamic Expo app configuration
├── eas.json                      # Standalone APK build profiles
├── .env.example                  # Environment variables template
└── README.md                     # Project documentation & guides
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/ChatApp/issues).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
