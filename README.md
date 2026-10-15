# Kanta — Android & Web Application

**Kanta** (Usman Computerized Kanta) is an accounting, vehicle weight ledger, personal loan khata, and expense tracking system designed for weighbridge shop owners in Pakistan.

---

## 📱 Building the Android APK (`Kanta.apk`)

This project is pre-configured with **Capacitor 8** and **Android Gradle**.

### Option A: Build with Gradle in 1 Command
Ensure you have **Java 17 or 21** and the **Android SDK** installed.

```bash
cd android
./gradlew assembleDebug
```
(On Windows: `gradlew.bat assembleDebug`)

Your debug APK will be generated immediately at:
`android/app/build/outputs/apk/debug/app-debug.apk`

You can rename this file to **`Kanta.apk`** and install it on any Android phone.

---

### Option B: Build with Android Studio
1. Open **Android Studio**.
2. Select **Open an Existing Project** and choose the `android` folder in this directory.
3. Wait for Gradle sync to complete.
4. Click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. Once built, click **locate** to find `Kanta.apk` and transfer it to your phone.

---

## 🌐 Running the Web Application
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
4. Sync web assets with the Android project:
   ```bash
   npx cap sync android
   ```

---

## ⚙️ App Identity & Package Info
- **App Name:** Kanta
- **Android Package ID:** `com.kanta.app`
- **Minimum SDK:** 24 (Android 7.0+)
- **Target SDK:** 34 / 36 (Android 14 / 15 / 16)
- **Primary Color:** Royal Blue (`#1D4ED8`)
- **Theme:** Material 3 with edge-to-edge support

---

## 👨‍💻 Created By
- **Developer:** Hamza Siddique
- **Phone:** 03257833708
