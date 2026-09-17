package com.fitnessos.app.healthconnect

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.StepsRecord
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Phase 8A foundation only: availability + permission architecture for
 * Health Connect. Deliberately does NOT read or write any health record —
 * see docs/health-connect-setup.md for what later phases add on top of this.
 *
 * Requests exactly two read-only permissions, matching the phase's explicit
 * scope: daily step count and exercise sessions. No write permission, no
 * heart rate/sleep/location/nutrition/weight/body-composition permission is
 * requested anywhere in this file.
 */
private val READ_STEPS_PERMISSION = HealthPermission.getReadPermission(StepsRecord::class)
private val READ_EXERCISE_PERMISSION = HealthPermission.getReadPermission(ExerciseSessionRecord::class)
private val REQUIRED_PERMISSIONS = setOf(READ_STEPS_PERMISSION, READ_EXERCISE_PERMISSION)

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
    private val pluginScope = CoroutineScope(Dispatchers.Main)
    private lateinit var permissionLauncher: ActivityResultLauncher<Set<String>>
    private var pendingPermissionCall: PluginCall? = null

    override fun load() {
        // Must be registered during load() (before any @PluginMethod can be
        // invoked) — ActivityResultLauncher registration has to happen before
        // the host Activity reaches STARTED, per AndroidX Activity Result API.
        permissionLauncher = activity.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract()
        ) { grantedPermissions ->
            val call = pendingPermissionCall
            pendingPermissionCall = null
            call?.resolve(permissionsPayload(grantedPermissions))
        }
    }

    private fun sdkStatus(): Int = HealthConnectClient.getSdkStatus(context)

    private fun statusString(status: Int): String = when (status) {
        HealthConnectClient.SDK_AVAILABLE -> "available"
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
        else -> "unavailable"
    }

    private fun permissionsPayload(granted: Set<String>): JSObject {
        val steps = granted.contains(READ_STEPS_PERMISSION)
        val exercise = granted.contains(READ_EXERCISE_PERMISSION)
        val grantedArray = JSArray()
        if (steps) grantedArray.put("READ_STEPS")
        if (exercise) grantedArray.put("READ_EXERCISE")
        return JSObject()
            .put("granted", grantedArray)
            .put("steps", steps)
            .put("exercise", exercise)
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        call.resolve(JSObject().put("value", sdkStatus() == HealthConnectClient.SDK_AVAILABLE))
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        call.resolve(JSObject().put("status", statusString(sdkStatus())))
    }

    @PluginMethod
    fun getGrantedPermissions(call: PluginCall) {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.resolve(permissionsPayload(emptySet()))
            return
        }
        pluginScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                call.resolve(permissionsPayload(granted))
            } catch (error: Exception) {
                call.reject("Failed to read Health Connect permissions", error)
            }
        }
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            // Never crash: report "nothing granted" instead of launching a
            // request the OS can't fulfil (Health Connect not usable here).
            call.resolve(permissionsPayload(emptySet()))
            return
        }
        pendingPermissionCall = call
        permissionLauncher.launch(REQUIRED_PERMISSIONS)
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
            activity.startActivity(intent)
            call.resolve()
        } catch (error: ActivityNotFoundException) {
            call.reject("Health Connect settings are not available on this device", error)
        }
    }
}
