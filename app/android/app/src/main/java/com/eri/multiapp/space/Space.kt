package com.eri.multiapp.space

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.LauncherApps
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Process
import android.os.UserHandle
import android.os.UserManager
import android.util.Base64
import android.util.Log
import com.eri.multiapp.R
import java.io.ByteArrayOutputStream

/**
 * The "Clone Space" is an Android managed (work) profile owned by Multi-App.
 * Every app cloned into it is a real, fully isolated second install with its own
 * data, accounts and notifications.
 *
 * The personal-profile instance of Multi-App talks to the Space instance by
 * sending implicit intents that the Space forwards across profiles (see
 * [setupInsideSpace]) to [ProfileActionActivity].
 */
object Space {
    private const val TAG = "MultiAppSpace"

    const val ACTION_PING = "com.eri.multiapp.action.PING"
    const val ACTION_CLONE = "com.eri.multiapp.action.CLONE"
    const val ACTION_REMOVE = "com.eri.multiapp.action.REMOVE"
    const val ACTION_FREEZE = "com.eri.multiapp.action.FREEZE"
    const val ACTION_UNFREEZE = "com.eri.multiapp.action.UNFREEZE"
    const val ACTION_LAUNCH = "com.eri.multiapp.action.LAUNCH"
    const val ACTION_DESTROY = "com.eri.multiapp.action.DESTROY"
    val ALL_ACTIONS = listOf(
        ACTION_PING, ACTION_CLONE, ACTION_REMOVE, ACTION_FREEZE,
        ACTION_UNFREEZE, ACTION_LAUNCH, ACTION_DESTROY,
    )

    const val EXTRA_PACKAGE = "com.eri.multiapp.extra.PACKAGE"
    const val EXTRA_ERROR = "com.eri.multiapp.extra.ERROR"

    private val PACKAGE_NAME = Regex("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z0-9_]+)+$")

    /** SECURITY: every package name crossing a boundary is validated first. */
    fun isValidPackageName(pkg: String?): Boolean =
        pkg != null && pkg.length <= 255 && PACKAGE_NAME.matches(pkg)

    const val PREFS_SECURITY = "multiapp_security"
    const val KEY_SECURE_SCREEN = "secure_screen"

    fun admin(ctx: Context) = ComponentName(ctx, MultiAppAdminReceiver::class.java)

    fun dpm(ctx: Context): DevicePolicyManager =
        ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

    private fun launcherApps(ctx: Context) =
        ctx.getSystemService(Context.LAUNCHER_APPS_SERVICE) as LauncherApps

    private fun userManager(ctx: Context) =
        ctx.getSystemService(Context.USER_SERVICE) as UserManager

    /** True when this process runs inside the Clone Space (we are its profile owner). */
    fun isInsideSpace(ctx: Context): Boolean = dpm(ctx).isProfileOwnerApp(ctx.packageName)

    fun isSupported(ctx: Context): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
            ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_MANAGED_USERS)

    /**
     * Runs inside the Space right after provisioning (and defensively on later starts).
     * Idempotent.
     */
    fun setupInsideSpace(ctx: Context) {
        if (!isInsideSpace(ctx)) return
        val dpm = dpm(ctx)
        val admin = admin(ctx)
        try {
            dpm.setProfileName(admin, ctx.getString(R.string.space_name))
        } catch (e: Exception) {
            Log.w(TAG, "setProfileName failed", e)
        }
        ctx.packageManager.setComponentEnabledSetting(
            ComponentName(ctx, ProfileActionActivity::class.java),
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
            PackageManager.DONT_KILL_APP,
        )
        dpm.clearCrossProfileIntentFilters(admin)
        val filter = IntentFilter().apply {
            ALL_ACTIONS.forEach { addAction(it) }
            addCategory(Intent.CATEGORY_DEFAULT)
        }
        dpm.addCrossProfileIntentFilter(admin, filter, DevicePolicyManager.FLAG_PARENT_CAN_ACCESS_MANAGED)
        dpm.setProfileEnabled(admin)
    }

    /** The profile that hosts our Space, seen from the personal side. */
    fun spaceUser(ctx: Context): UserHandle? {
        val me = Process.myUserHandle()
        val others = userManager(ctx).userProfiles.filter { it != me }
        val la = launcherApps(ctx)
        return others.firstOrNull { user ->
            try {
                la.getActivityList(ctx.packageName, user).isNotEmpty()
            } catch (e: Exception) {
                false
            }
        } ?: others.firstOrNull()
    }

    fun spaceIntent(action: String, pkg: String? = null): Intent =
        Intent(action).addCategory(Intent.CATEGORY_DEFAULT).apply {
            if (pkg != null) putExtra(EXTRA_PACKAGE, pkg)
        }

    /** Cross-profile forwarding exists only once our Space is fully set up. */
    fun isForwardingReady(ctx: Context): Boolean =
        ctx.packageManager.queryIntentActivities(spaceIntent(ACTION_PING), 0).isNotEmpty()

    /** "none" | "ready" | "paused" | "foreign" */
    fun state(ctx: Context): String {
        val user = spaceUser(ctx) ?: return "none"
        val ours = isForwardingReady(ctx) || try {
            launcherApps(ctx).getActivityList(ctx.packageName, user).isNotEmpty()
        } catch (e: Exception) {
            false
        }
        if (!ours) return "foreign"
        return if (userManager(ctx).isQuietModeEnabled(user)) "paused" else "ready"
    }

    fun unpause(ctx: Context): Boolean {
        val user = spaceUser(ctx) ?: return false
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                userManager(ctx).requestQuietModeEnabled(false, user)
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Cannot unpause Space", e)
            false
        }
    }

    /** Packages that currently have a launchable activity inside the Space. */
    fun spacePackages(ctx: Context): List<String> {
        val user = spaceUser(ctx) ?: return emptyList()
        return launcherApps(ctx).getActivityList(null, user)
            .map { it.componentName.packageName }
            .filter { it != ctx.packageName }
            .distinct()
    }

    /** Launches the clone of [pkg]. Returns false when it isn't launchable from here. */
    fun launchDirect(ctx: Context, pkg: String): Boolean {
        if (!isValidPackageName(pkg) || pkg == ctx.packageName) return false
        val user = spaceUser(ctx) ?: return false
        val la = launcherApps(ctx)
        return try {
            val activity = la.getActivityList(pkg, user).firstOrNull() ?: return false
            la.startMainActivity(activity.componentName, user, null, null)
            true
        } catch (e: Exception) {
            Log.w(TAG, "Direct launch failed for $pkg", e)
            false
        }
    }

    fun openCloneDetails(ctx: Context, pkg: String): Boolean {
        val user = spaceUser(ctx) ?: return false
        val la = launcherApps(ctx)
        return try {
            val activity = la.getActivityList(pkg, user).firstOrNull() ?: return false
            la.startAppDetailsActivity(activity.componentName, user, null, null)
            true
        } catch (e: Exception) {
            false
        }
    }

    // ---------- Icons ----------

    fun drawableToBitmap(d: Drawable, size: Int): Bitmap {
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        d.setBounds(0, 0, size, size)
        d.draw(canvas)
        return bmp
    }

    fun toDataUri(bmp: Bitmap): String {
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
        return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    /** App icon with a colored "twin" badge, used for home-screen shortcuts. */
    fun cloneBadgeIcon(ctx: Context, pkg: String, color: String): Bitmap {
        val size = 192
        val out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        val icon = ctx.packageManager.getApplicationIcon(pkg)
        val iconSize = (size * 0.86f).toInt()
        canvas.drawBitmap(drawableToBitmap(icon, iconSize), 0f, 0f, null)

        val badgeColor = try { Color.parseColor(color) } catch (e: Exception) { Color.parseColor("#03ADEE") }
        val r = size * 0.21f
        val cx = size - r - 2f
        val cy = size - r - 2f
        val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = badgeColor }
        val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = Color.WHITE }
        canvas.drawCircle(cx, cy, r + 6f, ring)
        canvas.drawCircle(cx, cy, r, fill)

        // Two overlapping rounded squares = "twin" glyph
        val s = r * 0.62f
        val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = Color.WHITE
            style = Paint.Style.STROKE
            strokeWidth = r * 0.16f
        }
        val back = RectF(cx - s * 0.75f, cy - s * 0.75f, cx + s * 0.35f, cy + s * 0.35f)
        val front = RectF(cx - s * 0.35f, cy - s * 0.35f, cx + s * 0.75f, cy + s * 0.75f)
        canvas.drawRoundRect(back, s * 0.25f, s * 0.25f, stroke)
        canvas.drawRoundRect(front, s * 0.25f, s * 0.25f, fill)
        canvas.drawRoundRect(front, s * 0.25f, s * 0.25f, stroke)
        return out
    }
}
