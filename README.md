<p align="center">
  <img src="branding/app-icon.png" width="120" alt="Multi-App icon" />
</p>

<h1 align="center">Multi-App</h1>
<p align="center"><b>Clone any app. Live two lives.</b><br/>by ERI · Android · React Native</p>

---

Multi-App lets you run **a second copy of any Android app**, for example a second WhatsApp with a different number, or a second Instagram, Telegram or TikTok account, on the same phone.

Each clone is a **real, separate install** with its own login, chats, files and notifications. Your original app is never touched.

## Features

- **One-tap cloning.** Pick an app and Multi-App makes a fresh copy, with a short "duplication" animation.
- **Popular apps first.** WhatsApp, WhatsApp Business, Telegram, Instagram, Facebook, Messenger, TikTok, Snapchat and others are suggested at the top of the list.
- **Personalize each clone.** Rename it (for example "WhatsApp Work") and give it a color tag.
- **Home-screen shortcuts.** Each shortcut shows the app icon with your colored "twin" badge.
- **Sleep mode.** Freeze a clone so it doesn't run in the background or send notifications, and wake it whenever you want.
- **Permissions & storage.** Jump straight to Android's settings for any clone.
- **Private by design.** Everything stays on the device. Multi-App has no servers, accounts or tracking.
- **Adaptive and themed launcher icons**, generated from the Multi-App logo.

## How it works

Multi-App uses Android's own **work profile** technology. Shelter and Island use the same approach.

1. On first launch, Multi-App creates a **Clone Space**, a managed profile that Multi-App owns as *profile owner*. Android shows a short "work profile" setup screen once.
2. To clone an app, Multi-App asks the Space to run `DevicePolicyManager.installExistingPackage()`. Android then installs the same APK a second time inside the Space, with **completely separate data**. Nothing is downloaded.
3. The personal copy of Multi-App talks to the copy inside the Space through **cross-profile intent forwarding**, using `ProfileActionActivity`, which is enabled only inside the Space.
4. Clones are launched with `LauncherApps.startMainActivity()`. They also appear in the phone's app drawer, in the **Work** tab, with a small briefcase badge.

Other cloner apps use "virtual engines" instead. Those hook into Android internals, break with every Android update, and are often flagged by Play Protect and by the apps themselves. Multi-App relies only on public, supported Android APIs.

### Limitations (by Android's design)

| | |
|---|---|
| One extra copy per app | Android allows one work profile, so each app can be cloned **once** (2 copies total). |
| Android 9+ | `installExistingPackage` requires API 28 or newer. |
| One work profile per phone | If a company work profile, Shelter or Island is already installed, remove it first. Multi-App detects this and explains what to do. |
| "Work apps" toggle | If the user pauses work apps from quick settings, clones pause too. Multi-App shows a **Resume** button. |
| Some OEM ROMs | A few heavily modified ROMs (some Xiaomi/MIUI builds) restrict work profiles. They have their own built-in "Dual apps" feature. |

## Requirements

- Node.js ≥ 22.11
- JDK 17
- Android Studio (Android SDK Platform 37, build-tools 37, NDK 27.1)
- An Android device or emulator running **Android 9 or newer**. The emulator image must include Google Play for the best results.

## Getting started

```bash
cd app
npm install
npx react-native run-android      # debug build on a connected device/emulator
```

Release APK:

```bash
cd app/android
./gradlew assembleRelease         # output: app/build/outputs/apk/release/app-release.apk
```

> ⚠️ The release build is currently signed with the debug keystore. Create your own keystore before publishing. See the [React Native signing guide](https://reactnative.dev/docs/signed-apk-android).

### Regenerating the icons

The launcher icons and the in-app logo are generated from `branding/logo.png`:

```powershell
powershell -ExecutionPolicy Bypass -File app/scripts/make-icons.ps1
```

## Project structure

```
branding/                 Source logo + exported app icon
app/
├── App.tsx               App state, clone lifecycle, screen routing
├── src/
│   ├── native.ts         Typed bridge to the Kotlin module
│   ├── store.ts          Clone names / colors / sleep state (SharedPreferences)
│   ├── theme.ts          Brand colors, clone color tags, popular apps
│   ├── components/       Glyph icons, buttons, bottom sheet, toasts
│   └── screens/          Welcome, Home, Sheets (picker/clone/settings), CloningOverlay
└── android/app/src/main/java/com/eri/multiapp/space/
    ├── Space.kt                  Core Clone Space logic (status, launch, icons)
    ├── Provisioning.kt           Device-admin receiver + provisioning activities
    ├── ProfileActionActivity.kt  Runs inside the Space: clone / sleep / remove / wipe
    ├── CloneLauncherActivity.kt  Invisible trampoline for home-screen shortcuts
    └── MultiAppSpaceModule.kt    React Native bridge (MultiAppSpace)
```

## Testing checklist

1. Fresh install → **Create my Clone Space** → finish Android's setup → the home screen appears.
2. Clone **WhatsApp** → open it → register a *different* phone number.
3. Rename it, change its color, and **Add to home screen**. Check that the shortcut opens the clone.
4. **Put to sleep** → it disappears from the Work tab and stops notifying → **Wake up**.
5. **Remove clone** → only the clone is deleted, and the original WhatsApp keeps its data.
6. Settings → **Delete Clone Space** → the app returns to the welcome screen.

## Roadmap

- Per-clone app lock (PIN / fingerprint)
- Notification preview for clones inside Multi-App
- Clone groups and a quick-switch widget
- Backup and restore of clone settings

---

© ERI · Multi-App
