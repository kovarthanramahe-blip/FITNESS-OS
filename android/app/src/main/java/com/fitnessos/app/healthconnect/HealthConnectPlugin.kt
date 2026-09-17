package com.fitnessos.app.healthconnect

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.Period
import java.time.format.DateTimeParseException

/**
 * Phase 8A foundation (availability + permission architecture) plus Phase
 * 8B.1's `getSteps` (real step data — see that method's own doc comment).
 * Still deliberately does NOT write anything to Health Connect or read any
 * record beyond steps — see docs/health-connect-setup.md.
 *
 * Requests exactly two read-only permissions, matching the phases' explicit
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

    /**
     * Named `requestHealthConnectPermissions`, not `requestPermissions` — the
     * Capacitor `Plugin` superclass already declares a `@PluginMethod
     * requestPermissions(PluginCall)` of its own (the generic runtime-permission
     * flow driven by `@CapacitorPlugin(permissions = [...])` and
     * `ActivityCompat.requestPermissions`). This plugin declares no
     * `permissions` alias and drives an entirely different flow — Health
     * Connect's own `PermissionController` request contract — so overriding
     * that method would be incorrect, not just a naming collision; a same-name
     * method without `override` is also a Kotlin compile error ("hides member
     * of supertype 'Plugin' and needs 'override' modifier"). The JS-facing
     * API is unaffected: `healthConnect.requestPermissions()` in
     * `src/lib/healthConnect/index.ts` still calls through to this method by
     * its own (renamed) name.
     */
    @PluginMethod
    fun requestHealthConnectPermissions(call: PluginCall) {
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

    private fun stepsErrorPayload(error: String, available: Boolean = false, permissionGranted: Boolean = false): JSObject {
        return JSObject()
            .put("available", available)
            .put("permissionGranted", permissionGranted)
            .put("days", JSArray())
            .put("error", error)
    }

    /**
     * Phase 8B.1: real step data only. `startDate`/`endDate` are `yyyy-mm-dd`
     * strings (never a raw epoch/UTC instant) and the range is inclusive on
     * both ends. Never rejects the call — every failure mode (unavailable,
     * permission not granted, an unparsable/inverted range, or the read
     * itself failing) resolves with a typed `error`, matching every other
     * method in this plugin.
     */
    @PluginMethod
    fun getSteps(call: PluginCall) {
        val startDate = parseLocalDateOrNull(call.getString("startDate"))
        val endDate = parseLocalDateOrNull(call.getString("endDate"))

        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            call.resolve(stepsErrorPayload("invalid_range"))
            return
        }

        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.resolve(stepsErrorPayload("unavailable"))
            return
        }

        pluginScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.contains(READ_STEPS_PERMISSION)) {
                    call.resolve(stepsErrorPayload("permission_denied", available = true))
                    return@launch
                }

                // aggregateGroupByPeriod buckets by LOCAL calendar date — its
                // TimeRangeFilter is LocalDateTime-based (not Instant/UTC) and
                // the 1-day Period slices it into one bucket per local day.
                // Health Connect's own aggregation also de-duplicates
                // overlapping/contributing records from multiple sources, so
                // this can't double-count the way summing raw StepsRecord
                // rows by hand could.
                val request = AggregateGroupByPeriodRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(
                        LocalDateTime.of(startDate, LocalTime.MIDNIGHT),
                        LocalDateTime.of(endDate.plusDays(1), LocalTime.MIDNIGHT),
                    ),
                    timeRangeSlicer = Period.ofDays(1),
                )
                val response = client.aggregateGroupByPeriod(request)
                val stepsByDate = mutableMapOf<LocalDate, Long>()
                for (group in response) {
                    stepsByDate[group.startTime.toLocalDate()] = group.result[StepsRecord.COUNT_TOTAL] ?: 0L
                }

                val days = JSArray()
                var date = startDate
                while (!date.isAfter(endDate)) {
                    days.put(JSObject().put("date", date.toString()).put("steps", stepsByDate[date] ?: 0L))
                    date = date.plusDays(1)
                }

                call.resolve(
                    JSObject()
                        .put("available", true)
                        .put("permissionGranted", true)
                        .put("days", days)
                )
            } catch (error: Exception) {
                call.resolve(stepsErrorPayload("query_failed", available = true, permissionGranted = true))
            }
        }
    }

    private fun parseLocalDateOrNull(value: String?): LocalDate? {
        if (value == null) return null
        return try {
            LocalDate.parse(value)
        } catch (error: DateTimeParseException) {
            null
        }
    }
}
