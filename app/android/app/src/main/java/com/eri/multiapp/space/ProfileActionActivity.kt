package com.eri.multiapp.space

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat

/**
 * Lives inside the Clone Space. Disabled in the personal profile, enabled in the
 * Space by [Space.setupInsideSpace], and reached from the personal side through
 * cross-profile intent forwarding. Results travel back via FORWARD_RESULT.
 */
class ProfileActionActivity : Activity() {

    private var uninstallReceiver: BroadcastReceiver? = null
    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Only Multi-App itself (from the personal side) may drive the Space.
        if (callingActivity?.packageName != packageName) {
            fail("Not allowed")
            return
        }
        if (!Space.isInsideSpace(this)) {
            fail("Clone Space is not set up")
            return
        }

        val pkg = intent.getStringExtra(Space.EXTRA_PACKAGE)
        if (pkg != null && (!Space.isValidPackageName(pkg) || pkg == packageName)) {
            // Never act on malformed input, and never on ourselves (hiding or
            // uninstalling the Space owner would break the Space).
            fail("Invalid app")
            return
        }
        try {
            when (intent.action) {
                Space.ACTION_PING -> ok()
                Space.ACTION_CLONE -> clone(requireNotNull(pkg))
                Space.ACTION_FREEZE -> setHidden(requireNotNull(pkg), true)
                Space.ACTION_UNFREEZE -> setHidden(requireNotNull(pkg), false)
                Space.ACTION_REMOVE -> remove(requireNotNull(pkg))
                Space.ACTION_LAUNCH -> launch(requireNotNull(pkg))
                Space.ACTION_DESTROY -> {
                    ok()
                    Space.dpm(this).wipeData(0)
                }
                else -> fail("Unknown action")
            }
        } catch (e: Exception) {
            fail(e.message ?: e.javaClass.simpleName)
        }
    }

    private val dpm get() = Space.dpm(this)
    private val admin get() = Space.admin(this)

    private fun isInstalledHere(pkg: String): Boolean = try {
        packageManager.getApplicationInfo(pkg, 0)
        true
    } catch (e: PackageManager.NameNotFoundException) {
        false
    }

    private fun clone(pkg: String) {
        if (dpm.isApplicationHidden(admin, pkg)) dpm.setApplicationHidden(admin, pkg, false)
        if (isInstalledHere(pkg)) return ok()

        var done = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            done = try { dpm.installExistingPackage(admin, pkg) } catch (e: Exception) { false }
        }
        if (!done) {
            // System apps are already present but disabled in a new profile.
            try {
                dpm.enableSystemApp(admin, pkg)
                done = isInstalledHere(pkg)
            } catch (_: Exception) {
            }
        }
        if (done) ok() else fail("Android refused to clone this app.")
    }

    private fun setHidden(pkg: String, hidden: Boolean) {
        if (dpm.setApplicationHidden(admin, pkg, hidden) || dpm.isApplicationHidden(admin, pkg) == hidden) ok()
        else fail("Could not change the app state.")
    }

    private fun launch(pkg: String) {
        val launch = packageManager.getLaunchIntentForPackage(pkg) ?: return fail("Clone not found")
        startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        ok()
    }

    private fun remove(pkg: String) {
        if (dpm.isApplicationHidden(admin, pkg)) dpm.setApplicationHidden(admin, pkg, false)
        if (!isInstalledHere(pkg)) return ok()
        val info = packageManager.getApplicationInfo(pkg, 0)
        if (info.flags and ApplicationInfo.FLAG_SYSTEM != 0) {
            // System apps can't be uninstalled; hiding removes them from the Space.
            dpm.setApplicationHidden(admin, pkg, true)
            return ok()
        }

        val action = "$packageName.UNINSTALL_RESULT"
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
                    PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                        @Suppress("DEPRECATION")
                        val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                        if (confirm != null && isSystemUninstallPrompt(confirm)) startActivity(confirm)
                        else fail("Uninstall blocked")
                    }
                    PackageInstaller.STATUS_SUCCESS -> ok()
                    else -> fail(intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "Uninstall failed")
                }
            }
        }
        uninstallReceiver = receiver
        ContextCompat.registerReceiver(this, receiver, IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED)

        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags = flags or PendingIntent.FLAG_MUTABLE
        val pi = PendingIntent.getBroadcast(this, pkg.hashCode(), Intent(action).setPackage(packageName), flags)
        packageManager.packageInstaller.uninstall(pkg, pi.intentSender)

        // Never leave the caller hanging.
        handler.postDelayed({ if (!isFinishing) fail("Uninstall timed out") }, 60_000)
    }

    /**
     * SECURITY: only relaunch the system uninstall confirmation, never an arbitrary
     * intent (prevents intent redirection), and strip any URI grant flags.
     */
    private fun isSystemUninstallPrompt(confirm: Intent): Boolean {
        confirm.flags = confirm.flags and
            (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or Intent.FLAG_GRANT_PREFIX_URI_PERMISSION).inv()
        val target = confirm.resolveActivity(packageManager) ?: return false
        if (target.packageName == packageName) return false
        return try {
            packageManager.getApplicationInfo(target.packageName, 0).flags and ApplicationInfo.FLAG_SYSTEM != 0
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    private fun ok() = finishWith(RESULT_OK, null)

    private fun fail(message: String) = finishWith(RESULT_CANCELED, message)

    private fun finishWith(code: Int, error: String?) {
        if (isFinishing) return
        setResult(code, Intent().apply { if (error != null) putExtra(Space.EXTRA_ERROR, error) })
        finish()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        uninstallReceiver?.let { try { unregisterReceiver(it) } catch (_: Exception) {} }
        super.onDestroy()
    }
}
