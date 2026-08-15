# ⚡ Electric Chat — Modern Real-Time Mobile Chat & Collaboration App

A mobile messaging and collaboration application built with **React Native**, **Expo SDK 54**, **Expo Router**, **Firebase Cloud Firestore**, and **Cloudinary**. Featuring a dual-theme **Modern Dark** & **Electric Light** design system, voice notes, media sharing, @mentions, push notifications, and Microsoft Teams & WhatsApp-style group channel management.

---

## 📱 Live Demo & APK Download

> 🚀 **Android APK Download**: [Download Latest Release APK](https://expo.dev/artifacts/eas/insert-your-build-id-here.apk) *(Replace with your EAS build link)*

---

## ✨ Features

### 💬 Real-Time Messaging & Media
* **Live Chat & Typing Indicators:** Sub-second real-time message sync with active typing animations.
* **🎙️ Audio Voice Notes:** Record, upload, and playback voice notes with responsive waveform progress sliders.
* **📷 Photo & Image Sharing:** Fast Cloudinary-powered media upload with fullscreen lightbox previews.
* **@Mentions Autocomplete:** Type `@` inside any group to tag members with instant popup suggestions and targeted push alerts.
* **Message Moderation:** Delete messages for sender or group administrators.

### 👥 Teams & WhatsApp Style Group Management
* **Two Clean Chat Modes:**
  * **`Everyone`**: All added group members can chat and share media.
  * **`Admin Broadcast`**: Only administrators can post; members can read.
* **Instant Member Addition:** Search any user by name, email, or phone, multi-select with interactive chips, and batch-add them to channels.
* **👑 Group Admin Delegation:** Promote any member to **Group Admin** (`Make Admin 👑`) to delegate full moderation, settings, and participant management.
* **Group Avatars & Customization:** Administrators can upload and update group photos and rename channels on the fly.

### 🔔 In-App & Push Notification Center
* Dedicated **Notifications Inbox** tracking messages, @mentions, and channel invitations with unread badges.
* Mark individual alerts or tap **Read All**.
* 1-tap deep linking from notifications directly into specific chats.

### 👤 Profile & Social Links
* Profile picture upload and real-time syncing across sender and receiver message bubbles.
* Editable fields: **Full Name**, **Phone Number**, **Bio / Status**, **LinkedIn URL**, and **GitHub / Portfolio URL**.
* Interactive one-tap social link buttons (LinkedIn, GitHub, Phone dialer).

### 🌊 Gestures & 120 FPS Native Animations
* **Horizontal Swipe Navigation:** Swipe left/right anywhere on the screen to switch seamlessly between **Chats**, **Contacts**, and **Profile** tabs with smart vertical scroll discrimination.
* **Hardware-Accelerated Transitions:** Native screen stack slide animations with zero frame drops.
* **Tactile Haptic Feedback:** Micro-haptics on tab switches, buttons, and actions.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Framework** | React Native (0.81), Expo SDK 54 |
| **Routing** | Expo Router 6 (File-based navigation) |
| **Authentication** | Firebase Authentication (Email/Password) |
| **Database** | Firebase Cloud Firestore (Realtime listeners) |
| **Media Storage** | Cloudinary REST API (Unsigned preset for Images & Audio) |
| **Notifications** | `expo-notifications` & Firestore sync |
| **Audio & Media** | `expo-av`, `expo-image-picker`, `@react-native-community/slider` |
| **Gestures & Haptics** | `react-native-gesture-handler`, `expo-haptics` |

---

## 🚀 Getting Started (Local Setup)

### 1. Prerequisites
* **Node.js** (v18 or v20+ recommended)
* **npm** or **yarn**
* **Expo Go app** (available on Google Play Store and iOS App Store) or an Android/iOS Emulator

---

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/yourusername/electric-chat-app.git
cd electric-chat-app
npm install
```

---

### 3. Firebase Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** with **Email/Password** sign-in provider.
3. Create a **Cloud Firestore** database (in production or test mode).
4. Register a **Web App** in your Firebase project to get your configuration credentials.
5. In Firestore, create the following composite indexes (if prompted in development):
   * Collection `messages` (Collection Group) with fields: `visibleTo` (ASC) + `createdAt` (ASC) + `__name__` (ASC).

#### Firestore Security Rules Example:
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

### 4. Cloudinary Setup (For Media Uploads)

1. Create a free account at [Cloudinary](https://cloudinary.com/).
2. In Cloudinary Console ➔ **Settings** ➔ **Upload Presets**:
   * Add a new Upload Preset.
   * Set **Signing Mode** to **Unsigned**.
   * Note down your **Cloud Name** and **Preset Name**.

---

### 5. Configure Environment Variables

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Fill in your actual Firebase and Cloudinary credentials:

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

### 6. Run the App Locally

Start the Expo development server:

```bash
npm start
# or
npx expo start
```

* **Physical Device:** Open the **Expo Go** app on your phone and scan the QR code displayed in your terminal.
* **Android Emulator:** Press `a` in the terminal.
* **iOS Simulator:** Press `i` in the terminal.

---

## 📦 Building Standalone APK (Android)

To generate a standalone `.apk` installable on any Android device using EAS (Expo Application Services):

### 1. Install EAS CLI & Login
```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS Project (First Time)
```bash
eas project:init
```

### 3. Build APK
Run the preview profile configured with `buildType: "apk"`:

```bash
eas build -p android --profile preview
```

Once the build finishes in the cloud, EAS will output a direct download link for the `.apk` file.

---

## 📁 Project Directory Structure

```
ChatApp/
├── src/
│   ├── app/                    # Expo Router file-based screens
│   │   ├── (auth)/             # Login & Signup screens
│   │   ├── (tabs)/             # Bottom tabs (Chats, Contacts, Profile)
│   │   ├── group/
│   │   │   ├── [id].tsx        # Direct & Group Chat room
│   │   │   └── add-members.tsx # Teams-style Add Members screen
│   │   ├── notifications.tsx   # Notifications inbox
│   │   └── _layout.tsx         # Root navigation stack & themes
│   ├── components/
│   │   └── ui/                 # ChatBubble, ChatInput, GroupSettingsModal, SwipeableTabWrapper
│   ├── context/
│   │   ├── AuthContext.tsx     # Firebase Auth state & user profiles
│   │   └── ThemeContext.tsx    # Modern Dark / Electric Light theme
│   ├── firebase/
│   │   ├── config.ts           # Firebase SDK initialization
│   │   └── firestore.ts        # Database helpers (messages, channels, notifications)
│   ├── types/                  # TypeScript interfaces & types
│   └── utils/
│       ├── cloudinary.ts       # Media upload helper
│       └── notifications.ts    # Push token & notification service
├── app.json                    # Expo app configuration
├── eas.json                    # EAS build profiles (APK configuration)
├── .env.example                # Environment variables template
└── README.md                   # Project documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
