package com.eri.multiapp.space

import android.Manifest
import android.app.Activity
import android.app.KeyguardManager
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.LauncherApps
import android.content.pm.PackageManager
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.CancellationSignal
import android.os.Process
import android.os.SystemClock
import android.view.HapticFeedbackConstants
import android.view.WindowManager
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule
import java.util.concurrent.ConcurrentHashMap

@ReactModule(name = MultiAppSpaceModule.NAME)
class MultiAppSpaceModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {

    companion object {
        const val NAME = "MultiAppSpace"
        private const val REQ_PROVISION = 4201
        private const val REQ_ACTION = 4202
        private const val REQ_AUTH = 4203
        private const val PREFS = "multiapp_store"
        private const val PENDING_TIMEOUT_MS = 90_000L
        private const val MAX_STORE_BYTES = 256 * 1024
    }

    private var pending: Promise? = null
    private var pendingCode = 0
    private var pendingSince = 0L
    private val iconCache = ConcurrentHashMap<String, String>()

    private val listener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode != pendingCode) return
            val p = pending ?: return
            clearPending()
            val ok = resultCode == Activity.RESULT_OK
            when (requestCode) {
                REQ_PROVISION -> p.resolve(ok)
                REQ_AUTH -> p.resolve(if (ok) "success" else "cancel")
                else ->
                    if (ok) p.resolve(true)
                    else p.reject("E_SPACE", data?.getStringExtra(Space.EXTRA_ERROR) ?: "Action cancelled")
            }
        }
    }

    init {
        ctx.addActivityEventListener(listener)
    }

    override fun getName() = NAME

    // ---------- Status ----------

    @ReactMethod
    fun getSpaceStatus(promise: Promise) {
        try {
            val inside = Space.isInsideSpace(ctx)
            val map = Arguments.createMap()
            map.putBoolean("supported", Space.isSupported(ctx))
            map.putBoolean("insideSpace", inside)
            map.putString("state", if (inside) "inside" else Space.state(ctx))
            map.putInt("sdk", Build.VERSION.SDK_INT)
            map.putString("device", "${Build.MANUFACTURER} ${Build.MODEL}")
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("E_STATUS", e.message, e)
        }
    }

    @ReactMethod
    fun createSpace(promise: Promise) {
        val activity = ctx.currentActivity ?: return promise.reject("E_NO_ACTIVITY", "App is not in foreground")
        val intent = Intent(DevicePolicyManager.ACTION_PROVISION_MANAGED_PROFILE).apply {
            putExtra(DevicePolicyManager.EXTRA_PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME, Space.admin(ctx))
            @Suppress("DEPRECATION")
            putExtra(DevicePolicyManager.EXTRA_PROVISIONING_SKIP_ENCRYPTION, true)
        }
        if (intent.resolveActivity(ctx.packageManager) == null) {
            return promise.reject("E_UNSUPPORTED", "This device does not support work profiles")
        }
        if (!beginPending(promise, REQ_PROVISION)) return
        startForResult(activity, intent, REQ_PROVISION)
    }

    @ReactMethod
    fun unpauseSpace(promise: Promise) = promise.resolve(Space.unpause(ctx))

    @ReactMethod
    fun destroySpace(promise: Promise) = runInSpace(Space.ACTION_DESTROY, null, promise)

    // ---------- Apps ----------

    /** Launchable apps in the personal profile. */
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        Thread {
            try {
                val la = ctx.getSystemService(Context.LAUNCHER_APPS_SERVICE) as LauncherApps
                val seen = HashSet<String>()
                val list = la.getActivityList(null, Process.myUserHandle())
                    .filter { it.componentName.packageName != ctx.packageName && seen.add(it.componentName.packageName) }
                    .sortedBy { it.label.toString().lowercase() }
                val out = Arguments.createArray()
                for (a in list) {
                    val pkg = a.componentName.packageName
                    val m = Arguments.createMap()
                    m.putString("packageName", pkg)
                    m.putString("label", a.label.toString())
                    m.putBoolean("system", a.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM != 0)
                    m.putString("icon", iconCache.getOrPut(pkg) {
                        Space.toDataUri(Space.drawableToBitmap(a.getIcon(0), 128))
                    })
                    out.pushMap(m)
                }
                promise.resolve(out)
            } catch (e: Exception) {
                promise.reject("E_APPS", e.message, e)
            }
        }.start()
    }

    /** Packages currently installed (and awake) inside the Space. */
    @ReactMethod
    fun getSpacePackages(promise: Promise) {
        try {
            val out = Arguments.createArray()
            Space.spacePackages(ctx).forEach { out.pushString(it) }
            promise.resolve(out)
        } catch (e: Exception) {
            promise.reject("E_SPACE_APPS", e.message, e)
        }
    }

    @ReactMethod
    fun cloneApp(pkg: String, promise: Promise) = runInSpace(Space.ACTION_CLONE, pkg, promise)

    @ReactMethod
    fun removeClone(pkg: String, promise: Promise) = runInSpace(Space.ACTION_REMOVE, pkg, promise)

    @ReactMethod
    fun freezeClone(pkg: String, promise: Promise) = runInSpace(Space.ACTION_FREEZE, pkg, promise)

    @ReactMethod
    fun unfreezeClone(pkg: String, promise: Promise) = runInSpace(Space.ACTION_UNFREEZE, pkg, promise)

    @ReactMethod
    fun launchClone(pkg: String, promise: Promise) {
        if (!Space.isValidPackageName(pkg)) return promise.reject("E_INVALID", "Invalid app")
        if (Space.launchDirect(ctx, pkg)) promise.resolve(true)
        else runInSpace(Space.ACTION_LAUNCH, pkg, promise)
    }

    @ReactMethod
    fun openCloneSettings(pkg: String, promise: Promise) {
        if (!Space.isValidPackageName(pkg)) return promise.reject("E_INVALID", "Invalid app")
        promise.resolve(Space.openCloneDetails(ctx, pkg))
    }

    @ReactMethod
    fun pinShortcut(pkg: String, label: String, color: String, promise: Promise) {
        if (!Space.isValidPackageName(pkg)) return promise.reject("E_INVALID", "Invalid app")
        try {
            if (!ShortcutManagerCompat.isRequestPinShortcutSupported(ctx)) return promise.resolve(false)
            val intent = Intent(ctx, CloneLauncherActivity::class.java)
                .setAction(Intent.ACTION_VIEW)
                .putExtra(Space.EXTRA_PACKAGE, pkg)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            val info = ShortcutInfoCompat.Builder(ctx, "clone_$pkg")
                .setShortLabel(label.take(40).ifBlank { pkg })
                .setIcon(IconCompat.createWithBitmap(Space.cloneBadgeIcon(ctx, pkg, color)))
                .setIntent(intent)
                .build()
            promise.resolve(ShortcutManagerCompat.requestPinShortcut(ctx, info, null))
        } catch (e: Exception) {
            promise.reject("E_SHORTCUT", e.message, e)
        }
    }

    // ---------- Security ----------

    /**
     * Unlock with fingerprint / face / device PIN.
     * Resolves "success" | "cancel" | "lockout" | "unavailable" (no screen lock set).
     */
    @ReactMethod
    fun authenticate(title: String, subtitle: String, promise: Promise) {
        val activity = ctx.currentActivity ?: return promise.resolve("cancel")
        val km = ctx.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        if (!km.isDeviceSecure) return promise.resolve("unavailable")

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            @Suppress("DEPRECATION")
            val intent = km.createConfirmDeviceCredentialIntent(title, subtitle)
                ?: return promise.resolve("unavailable")
            if (!beginPending(promise, REQ_AUTH)) return
            startForResult(activity, intent, REQ_AUTH)
            return
        }

        UiThreadUtil.runOnUiThread {
            try {
                val builder = BiometricPrompt.Builder(activity).setTitle(title).setSubtitle(subtitle)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    builder.setAllowedAuthenticators(
                        BiometricManager.Authenticators.BIOMETRIC_WEAK or
                            BiometricManager.Authenticators.DEVICE_CREDENTIAL,
                    )
                } else {
                    @Suppress("DEPRECATION")
                    builder.setDeviceCredentialAllowed(true)
                }
                var settled = false
                val settle = { v: String ->
                    if (!settled) {
                        settled = true
                        promise.resolve(v)
                    }
                }
                builder.build().authenticate(
                    CancellationSignal(),
                    activity.mainExecutor,
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult?) {
                            settle("success")
                        }

                        override fun onAuthenticationError(errorCode: Int, errString: CharSequence?) {
                            settle(
                                when (errorCode) {
                                    BiometricPrompt.BIOMETRIC_ERROR_HW_NOT_PRESENT,
                                    BiometricPrompt.BIOMETRIC_ERROR_HW_UNAVAILABLE,
                                    BiometricPrompt.BIOMETRIC_ERROR_NO_DEVICE_CREDENTIAL,
                                    -> "unavailable"
                                    BiometricPrompt.BIOMETRIC_ERROR_LOCKOUT,
                                    BiometricPrompt.BIOMETRIC_ERROR_LOCKOUT_PERMANENT,
                                    -> "lockout"
                                    else -> "cancel"
                                },
                            )
                        }
                    },
                )
            } catch (e: Exception) {
                promise.resolve("unavailable")
            }
        }
    }

    /** Hide Multi-App from screenshots, screen recording and the recents preview. */
    @ReactMethod
    fun setSecureScreen(enabled: Boolean, promise: Promise) {
        ctx.getSharedPreferences(Space.PREFS_SECURITY, Context.MODE_PRIVATE)
            .edit().putBoolean(Space.KEY_SECURE_SCREEN, enabled).apply()
        UiThreadUtil.runOnUiThread {
            ctx.currentActivity?.window?.let {
                if (enabled) it.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                else it.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun getSecurityInfo(promise: Promise) {
        val km = ctx.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        val map = Arguments.createMap()
        map.putBoolean("deviceSecure", km.isDeviceSecure)
        map.putBoolean(
            "internet",
            ctx.packageManager.checkPermission(Manifest.permission.INTERNET, ctx.packageName) ==
                PackageManager.PERMISSION_GRANTED,
        )
        map.putBoolean("debuggable", ctx.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0)
        map.putBoolean(
            "secureScreen",
            ctx.getSharedPreferences(Space.PREFS_SECURITY, Context.MODE_PRIVATE)
                .getBoolean(Space.KEY_SECURE_SCREEN, false),
        )
        promise.resolve(map)
    }

    /** kind: "tap" | "success" | "warning" */
    @ReactMethod
    fun haptic(kind: String) {
        UiThreadUtil.runOnUiThread {
            val view = ctx.currentActivity?.window?.decorView ?: return@runOnUiThread
            val constant = when {
                kind == "success" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> HapticFeedbackConstants.CONFIRM
                kind == "warning" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> HapticFeedbackConstants.REJECT
                kind == "tap" -> HapticFeedbackConstants.CLOCK_TICK
                else -> HapticFeedbackConstants.KEYBOARD_TAP
            }
            view.performHapticFeedback(constant)
        }
    }

    // ---------- Tiny key-value store (clone names, colors, settings) ----------

    @ReactMethod
    fun getStore(promise: Promise) =
        promise.resolve(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", null))

    @ReactMethod
    fun setStore(json: String, promise: Promise) {
        if (json.length > MAX_STORE_BYTES) return promise.reject("E_STORE", "Store too large")
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("data", json).apply()
        promise.resolve(true)
    }

    // ---------- Cross-profile plumbing ----------

    private fun runInSpace(action: String, pkg: String?, promise: Promise) {
        if (pkg != null && (!Space.isValidPackageName(pkg) || pkg == ctx.packageName)) {
            return promise.reject("E_INVALID", "Invalid app")
        }
        val activity = ctx.currentActivity ?: return promise.reject("E_NO_ACTIVITY", "App is not in foreground")
        val intent = Space.spaceIntent(action, pkg)
        if (!Space.isForwardingReady(ctx)) {
            // A paused Space (work apps switched off) can't receive actions: wake it and say so.
            if (Space.state(ctx) == "paused") {
                Space.unpause(ctx)
                return promise.reject("E_PAUSED", "Clone Space is paused. Turn on “Work apps”, then try again.")
            }
            return promise.reject("E_NO_SPACE", "Clone Space is not ready")
        }
        if (!beginPending(promise, REQ_ACTION)) return
        startForResult(activity, intent, REQ_ACTION)
    }

    /** One system round-trip at a time; a request lost for 90s is expired instead of blocking forever. */
    private fun beginPending(promise: Promise, code: Int): Boolean {
        val old = pending
        if (old != null) {
            if (SystemClock.elapsedRealtime() - pendingSince < PENDING_TIMEOUT_MS) {
                promise.reject("E_BUSY", "Another action is running")
                return false
            }
            old.reject("E_TIMEOUT", "Action timed out")
        }
        pending = promise
        pendingCode = code
        pendingSince = SystemClock.elapsedRealtime()
        return true
    }

    private fun clearPending() {
        pending = null
        pendingCode = 0
    }

    private fun startForResult(activity: Activity, intent: Intent, code: Int) {
        try {
            @Suppress("DEPRECATION")
            activity.startActivityForResult(intent, code)
        } catch (e: Exception) {
            val p = pending
            clearPending()
            p?.reject("E_SPACE", e.message, e)
        }
    }
}
