package com.eri.multiapp.space

import android.app.Activity
import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.os.Bundle

/** Device-admin receiver that makes Multi-App the owner of its Clone Space. */
class MultiAppAdminReceiver : DeviceAdminReceiver() {
    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        Space.setupInsideSpace(context)
    }
}

/** Android 10+: asks which provisioning mode we want — always a work profile. */
class ProvisioningModeActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val result = Intent().putExtra(
            DevicePolicyManager.EXTRA_PROVISIONING_MODE,
            DevicePolicyManager.PROVISIONING_MODE_MANAGED_PROFILE,
        )
        setResult(RESULT_OK, result)
        finish()
    }
}

/** Android 10+: final step of provisioning, runs inside the freshly created Space. */
class PolicyComplianceActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Space.setupInsideSpace(this)
        setResult(RESULT_OK)
        finish()
    }
}

/** Sent by the system inside the Space once provisioning succeeds. */
class ProvisioningSuccessActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Space.setupInsideSpace(this)
        finish()
    }
}
