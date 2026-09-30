package com.eri.multiapp.space

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast

/** Invisible trampoline behind home-screen shortcuts: opens a clone, then vanishes. */
class CloneLauncherActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pkg = intent.getStringExtra(Space.EXTRA_PACKAGE)
        if (!Space.isValidPackageName(pkg) || pkg == null || pkg == packageName) {
            finish()
            return
        }
        if (Space.launchDirect(this, pkg)) {
            finish()
            return
        }
        if (!Space.isForwardingReady(this)) {
            Toast.makeText(this, "This clone is no longer available", Toast.LENGTH_SHORT).show()
            finish()
            return
        }
        try {
            // Stay alive until the Space answers: it identifies us through this activity.
            @Suppress("DEPRECATION")
            startActivityForResult(Space.spaceIntent(Space.ACTION_LAUNCH, pkg), 1)
        } catch (e: Exception) {
            finish()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode != RESULT_OK) {
            Toast.makeText(this, "Couldn't open this clone", Toast.LENGTH_SHORT).show()
        }
        finish()
    }
}
