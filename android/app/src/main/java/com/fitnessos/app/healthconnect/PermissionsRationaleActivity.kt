package com.fitnessos.app.healthconnect

import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Health Connect requires every app requesting permissions to provide a
 * static "privacy rationale" screen it can link users to — both from the
 * OS permission dialog and from Health Connect's own app-management UI.
 * Without this activity declared and reachable (see AndroidManifest.xml's
 * two intent-filters for it, covering both the pre- and post-API-34
 * mechanisms), Health Connect silently refuses to show the permission
 * dialog for this app at all.
 *
 * Deliberately static, plain-text content — this is not a real settings
 * screen and reads no data itself.
 */
class PermissionsRationaleActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val message = TextView(this).apply {
            text = """
                Fitness OS reads your daily step count from Health Connect.

                Steps recorded by your phone, watch, or other connected apps
                (including Samsung Health) may appear here once you enable
                sync for those sources inside Health Connect or Samsung
                Health's own settings.

                Fitness OS never writes any data to Health Connect and never
                shares this data with anyone else.
            """.trimIndent()
            textSize = 16f
            setTextColor(Color.BLACK)
            gravity = Gravity.START
            setPadding(48, 96, 48, 96)
        }

        setContentView(ScrollView(this).apply { addView(message) })
    }
}
