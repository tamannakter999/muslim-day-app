# Muslim Day — Android APK বানানোর গাইড

এই প্রজেক্টটিতে **অফলাইন PWA** এবং **নেটিভ Android APK (Capacitor)** — দুটোই সম্পূর্ণভাবে সেটআপ করা আছে।

## ভয়েস রিমাইন্ডার ফাইলগুলো (অফলাইন)
- `audio/durood_reminder.mp3` — পুরুষ বাংলা ভয়েস: **"দুরুদ পড়ুন"**
- `audio/istighfar_reminder.mp3` — পুরুষ বাংলা ভয়েস: **"নিজের পাপের জন্য ক্ষমা চান"**

---

## পদ্ধতি ১: Android Studio দিয়ে APK বানানো (কম্পিউটারে)
১. প্রজেক্ট ফোল্ডারে (`muslim-day-app`) টার্মিনাল খুলুন এবং রান করুন:
```bash
npm install
npm run android:init
```
২. এবার Android Studio ওপেন করুন:
```bash
npm run android:open
```
৩. Android Studio-তে **Build → Build Bundle(s) / APK(s) → Build APK(s)** ক্লিক করলেই আপনার `.apk` ফাইল তৈরি হয়ে যাবে!

---

## পদ্ধতি ২: কম্পিউটারে Android Studio ছাড়াই APK বানানো (GitHub Actions)
১. `muslim-day-app` ফোল্ডারটি একটি GitHub রিপোজিটরিতে আপলোড করুন।
২. GitHub-এর **Actions** ট্যাবে যান — অটোমেটিক `Build Android APK` রান হবে।
৩. বিল্ড শেষ হলে **Artifacts** থেকে `MuslimDay-Android-APK` (`.apk`) ডাউনলোড করে আপনার ফোনে ইনস্টল করুন!

---

## পদ্ধতি ৩: সরাসরি মোবাইলে ইনস্টল (PWA — এখনই)
অ্যান্ড্রয়েড Chrome ব্রাউজারে অ্যাপটি ওপেন করে মেনু (⋮) থেকে **"Add to Home screen / Install App"** দিলেই এটি অফলাইন অ্যাপ হিসেবে হোম স্ক্রিনে বসে যাবে।
