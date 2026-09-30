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
- **App lock.** Fingerprint, face or PIN to open Multi-App. A fresh check is also required before removing a clone or deleting the Space.
- **Hide content.** Blocks screenshots, screen recording and the recent-apps preview.
- **Light and dark mode.** Follows the system, or you can choose one yourself.
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

## Security

Multi-App holds admin rights over the Clone Space, so it is hardened against being abused as a backdoor:

| Protection | What it does |
|---|---|
| **Signature-locked control** | The component that performs clone, sleep, remove and wipe actions is protected by a `signature` permission **and** checks who called it. Only Multi-App, signed with your key, can use it. Other apps get "Not allowed", and that includes apps cloned into the Space. |
| **Nothing else exposed** | The shortcut launcher is not exported. Provisioning screens need `BIND_DEVICE_ADMIN`, which only Android itself holds. The one exception only re-runs setup inside the Space and does nothing anywhere else. |
| **Input validation** | Every package name is checked against a strict pattern. Actions on Multi-App's own package are refused, so the Space owner can't be hidden or removed. |
| **No intent redirection** | Only the system uninstall prompt is relaunched, with URI grant flags removed. |
| **Offline release builds** | Release builds have **no internet permission**. Even a bug couldn't send data anywhere. (Debug builds keep internet for the Metro bundler only.) |
| **Minimal admin rights** | Admin rights apply only inside the Clone Space. The device-admin policy list is empty, so there's no control over your personal apps, data or passwords. |
| **No backups or transfer** | `allowBackup=false` plus data-extraction rules keep Multi-App data out of the cloud and off device-to-device copies. |
| **App lock and Hide content** | Biometric or PIN lock (it re-locks after 15 seconds in the background), `FLAG_SECURE`, and a fresh check before destructive actions. |
| **Tapjacking protection** | Taps are ignored while another app draws over Multi-App. |
| **Hardened build** | R8 shrinking and obfuscation, and debug logs are stripped from release builds. |
| **Safe storage** | Saved settings are validated on load, so a corrupted or tampered file can't crash the app or inject bad data. |

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

### Signing with your own key (required before sharing the app)

Multi-App trusts only apps signed with **its own key**, so that key must stay private. Without it, Gradle falls back to React Native's public debug key, which anyone can use. Never share an APK built that way.

1. Create a key once, and keep the file and its passwords safe:
   ```bash
   keytool -genkeypair -v -keystore multiapp-release.keystore -alias multiapp -keyalg RSA -keysize 4096 -validity 10000
   ```
2. Add these lines to `~/.gradle/gradle.properties`. This is your user folder, **not** the repo:
   ```properties
   MULTIAPP_STORE_FILE=C:/path/to/multiapp-release.keystore
   MULTIAPP_STORE_PASSWORD=********
   MULTIAPP_KEY_ALIAS=multiapp
   MULTIAPP_KEY_PASSWORD=********
   ```
3. Run `./gradlew assembleRelease`. The build now signs the APK with your key and shrinks and obfuscates it with R8.

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
│   ├── store.ts          Clone names/colors/sleep state + settings (validated on load)
│   ├── theme.ts          Light/dark palettes, clone color tags, popular apps
│   ├── components/       SVG icons, gradient/wave art, buttons, switch, bottom sheet, toasts
│   └── screens/          Welcome, Home, Lock, Sheets (picker/clone/settings), CloningOverlay
└── android/app/src/main/java/com/eri/multiapp/space/
    ├── Space.kt                  Core Clone Space logic (status, launch, validation, icons)
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
6. Settings → **App lock** on → leave the app for more than 15 seconds → come back. It should be locked.
7. **Hide content** on → recent apps shows a blank preview, and screenshots are blocked.
8. Settings → **Delete Clone Space** → asks for your fingerprint or PIN → the app returns to the welcome screen.

## Roadmap

- Notification preview for clones inside Multi-App
- Clone groups and a quick-switch widget
- Backup and restore of clone settings

---

© ERI · Multi-App
