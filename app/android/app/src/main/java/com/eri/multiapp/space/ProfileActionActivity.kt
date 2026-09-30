package com.eri.multiapp.space

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.IntentSender
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.UserManager
import androidx.core.content.ContextCompat
import java.io.File

/**
 * Lives inside the Clone Space. Disabled in the personal profile, enabled in the
 * Space by [Space.setupInsideSpace], and reached from the personal side through
 * cross-profile intent forwarding. Results travel back via FORWARD_RESULT.
 */
class ProfileActionActivity : Activity() {

    companion object {
        private const val MAX_APKS = 64
        private const val INSTALL_TIMEOUT_MS = 5 * 60_000L
        private const val UNINSTALL_TIMEOUT_MS = 60_000L
    }

    private var statusReceiver: BroadcastReceiver? = null
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

        // System apps are already present but disabled in a new profile.
        try {
            dpm.enableSystemApp(admin, pkg)
        } catch (_: Exception) {
        }
        if (isInstalledHere(pkg)) return ok()

        // Only works when a device owner manages the phone (an "affiliated" Space),
        // which personal phones never have. Cheap to try.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                if (dpm.installExistingPackage(admin, pkg) && isInstalledHere(pkg)) return ok()
            } catch (_: Exception) {
            }
        }

        val paths = intent.getStringArrayExtra(Space.EXTRA_APKS) ?: return fail("Android refused to clone this app.")
        installCopy(pkg, paths)
    }

    /** Regular apps: installs a copy of the original's APK files. Android asks the user to confirm. */
    private fun installCopy(pkg: String, paths: Array<String>) {
        // Some phones block installs in a new work profile; the Space is ours to allow them.
        try {
            dpm.clearUserRestriction(admin, UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES)
        } catch (_: Exception) {
        }
        val installer = packageManager.packageInstaller
        val sender = statusSender("$packageName.INSTALL_RESULT", pkg, "Install")
        Thread {
            var id = -1
            try {
                val apks = sourceApks(pkg, paths) ?: throw IllegalArgumentException("Couldn't read this app's files.")
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
                    setAppPackageName(pkg)
                    setSize(apks.sumOf { it.length() })
                }
                id = installer.createSession(params)
                installer.openSession(id).use { session ->
                    for (apk in apks) {
                        apk.inputStream().use { input ->
                            session.openWrite(apk.name, 0, apk.length()).use { out ->
                                input.copyTo(out, 1 shl 16)
                                session.fsync(out)
                            }
                        }
                    }
                    session.commit(sender)
                }
            } catch (e: Exception) {
                if (id != -1) try { installer.abandonSession(id) } catch (_: Exception) {}
                handler.post { fail(e.message ?: "Couldn't copy this app.") }
            }
        }.start()

        // Copying and confirming can take a while, but never leave the caller hanging.
        handler.postDelayed({ if (!isFinishing) fail("Install timed out") }, INSTALL_TIMEOUT_MS)
    }

    /** SECURITY: only real APK files of the requested app, from Android's app directories. */
    private fun sourceApks(pkg: String, paths: Array<String>): List<File>? {
        if (paths.isEmpty() || paths.size > MAX_APKS) return null
        val files = paths.map { File(it).canonicalFile }
        if (!files.all(Space::isApkFile) || files.distinctBy { it.name }.size != files.size) return null
        @Suppress("DEPRECATION")
        val info = packageManager.getPackageArchiveInfo(files[0].path, 0)
        return if (info?.packageName == pkg) files else null
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

        packageManager.packageInstaller.uninstall(pkg, statusSender("$packageName.UNINSTALL_RESULT", pkg, "Uninstall"))

        // Never leave the caller hanging.
        handler.postDelayed({ if (!isFinishing) fail("Uninstall timed out") }, UNINSTALL_TIMEOUT_MS)
    }

    /** Listens for PackageInstaller's answer ([what] = "Install" / "Uninstall") and finishes with it. */
    private fun statusSender(action: String, pkg: String, what: String): IntentSender {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
                    PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                        @Suppress("DEPRECATION")
                        val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                        if (confirm != null && isSystemPrompt(confirm)) startActivity(confirm)
                        else fail("$what blocked")
                    }
                    PackageInstaller.STATUS_SUCCESS -> ok()
                    PackageInstaller.STATUS_FAILURE_ABORTED -> fail("$what cancelled")
                    else -> fail(intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "$what failed")
                }
            }
        }
        statusReceiver = receiver
        ContextCompat.registerReceiver(this, receiver, IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED)

        var flags = PendingIntent.FLAG_UPDATE_CURRENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags = flags or PendingIntent.FLAG_MUTABLE
        return PendingIntent.getBroadcast(this, pkg.hashCode(), Intent(action).setPackage(packageName), flags).intentSender
    }

    /**
     * SECURITY: only relaunch the system install/uninstall confirmation, never an
     * arbitrary intent (prevents intent redirection), and strip any URI grant flags.
     */
    private fun isSystemPrompt(confirm: Intent): Boolean {
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
        statusReceiver?.let { try { unregisterReceiver(it) } catch (_: Exception) {} }
        super.onDestroy()
    }
}
