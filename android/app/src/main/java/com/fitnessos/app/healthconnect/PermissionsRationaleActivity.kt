package com.fitnessos.app.healthconnect

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import com.fitnessos.app.R

/**
 * Health Connect's own permission screen links here two ways, depending on
 * the Android version — this Activity must exist and handle both intents
 * (declared in AndroidManifest.xml) or Health Connect's permission request
 * for this app is rejected outright:
 *  - Android 13 and below: the "privacy policy" link on the permission
 *    screen launches androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE.
 *  - Android 14+: the system launches the ViewPermissionUsageActivity
 *    activity-alias (see manifest), which targets this same Activity.
 *
 * This is intentionally a plain, static native screen for this phase — no
 * Health Connect API calls happen here, only rationale text.
 */
class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_permissions_rationale)
        findViewById<Button>(R.id.health_connect_rationale_close).setOnClickListener { finish() }
    }
}
