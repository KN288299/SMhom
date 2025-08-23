# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native specific rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.jni.** { *; }

# Hermes engine rules
-keep class com.facebook.hermes.** { *; }

# WebRTC rules
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# Socket.io rules
-keep class io.socket.** { *; }
-dontwarn io.socket.**

# React Native Gesture Handler rules
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Suppress warnings for missing classes in JavaScript runtime
-dontwarn org.mozilla.javascript.**
-dontwarn javax.script.**
