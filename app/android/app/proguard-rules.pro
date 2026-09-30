# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# --- Multi-App ---
# Components referenced from the manifest and the React Native bridge.
-keep class com.eri.multiapp.** { *; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod *; }
# Strip debug/verbose logging from release builds.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
}
