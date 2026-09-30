package com.eri.multiapp.space

import android.app.Activity
import android.os.Bundle
import android.widget.Toast

/** Invisible trampoline behind home-screen shortcuts: opens a clone, then vanishes. */
class CloneLauncherActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pkg = intent.getStringExtra(Space.EXTRA_PACKAGE)
        if (pkg == null) {
            finish()
            return
        }
        if (!Space.launchDirect(this, pkg)) {
            val forward = Space.spaceIntent(Space.ACTION_LAUNCH, pkg)
            if (packageManager.queryIntentActivities(forward, 0).isNotEmpty()) {
                @Suppress("DEPRECATION")
                startActivityForResult(forward, 1)
            } else {
                Toast.makeText(this, "This clone is no longer available", Toast.LENGTH_SHORT).show()
            }
        }
        finish()
    }
}
