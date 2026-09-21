package com.fitnessos.app.healthconnect

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregationResultGroupedByPeriod
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateGroupByPeriodRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.Period
import java.time.format.DateTimeParseException

/**
 * Read-only bridge to Android Health Connect, scoped to exactly one data
 * type for this phase: daily step totals (`StepsRecord`). This is the
 * integration boundary the app actually talks to —
 *
 *   Galaxy Watch -> Samsung Health -> Health Connect -> this plugin
 *
 * — never a direct Samsung Health SDK dependency. Whatever Health Connect
 * itself has synced from Samsung Health (or any other source the user has
 * enabled) is what `getSteps` returns; this plugin has no way to know or
 * care which app originally wrote a given record.
 *
 * Every method resolves (never throws past the JS bridge) with either a
 * successful payload or a rejection carrying a stable error code, so the
 * TypeScript side (`src/lib/healthConnect/index.ts`) can distinguish
 * "Health Connect isn't available", "permission not granted", and "the
 * read itself failed" from a legitimate zero.
 */
@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
    private val scope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())
    private var client: HealthConnectClient? = null

    companion object {
        // The Health Connect app's own package — used both to check
        // availability (getSdkStatus) and declared under <queries> in the
        // manifest so this app is allowed to see it on Android 11+.
        private const val PROVIDER_PACKAGE = "com.google.android.apps.healthdata"

        private val STEPS_PERMISSION = HealthPermission.getReadPermission(StepsRecord::class)

        // Optional: lets Fitness OS read data logged before it first
        // requested access, subject to the user granting it — Health
        // Connect's default behaviour without this permission is to only
        // expose data from the 30 days prior to the *first* permission
        // grant, which would otherwise make "no data" and "history not
        // granted" indistinguishable from this app's point of view.
        private const val HISTORY_PERMISSION = HealthPermission.PERMISSION_READ_HEALTH_DATA_HISTORY

        private val REQUESTED_PERMISSIONS = setOf(STEPS_PERMISSION, HISTORY_PERMISSION)
    }

    override fun handleOnDestroy() {
        scope.cancel()
        super.handleOnDestroy()
    }

    private fun sdkStatus(): Int = HealthConnectClient.getSdkStatus(context, PROVIDER_PACKAGE)

    private fun clientOrNull(): HealthConnectClient? {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) return null
        return client ?: HealthConnectClient.getOrCreate(context).also { client = it }
    }

    private fun statusPayload(available: Boolean, granted: Set<String>): JSObject =
        JSObject()
            .put("available", available)
            .put("hasStepsPermission", granted.contains(STEPS_PERMISSION))
            .put("hasHistoryPermission", granted.contains(HISTORY_PERMISSION))

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        call.resolve(JSObject().put("available", sdkStatus() == HealthConnectClient.SDK_AVAILABLE))
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val current = clientOrNull()
        if (current == null) {
            call.resolve(statusPayload(available = false, granted = emptySet()))
            return
        }
        scope.launch {
            try {
                val granted = current.permissionController.getGrantedPermissions()
                call.resolve(statusPayload(available = true, granted = granted))
            } catch (e: Exception) {
                call.reject("Failed to read Health Connect permission state: ${e.message}", "STATUS_FAILED", e)
            }
        }
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        val current = clientOrNull()
        if (current == null) {
            // Nothing to request against — resolve with the same shape
            // getStatus() would, rather than rejecting, since "Health
            // Connect isn't installed" isn't really a request *failure*.
            call.resolve(statusPayload(available = false, granted = emptySet()))
            return
        }
        val contract = PermissionController.createRequestPermissionResultContract()
        val intent = contract.createIntent(context, REQUESTED_PERMISSIONS)
        startActivityForResult(call, intent, "handlePermissionsResult")
    }

    @ActivityCallback
    fun handlePermissionsResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val current = clientOrNull()
        if (current == null) {
            call.resolve(statusPayload(available = false, granted = emptySet()))
            return
        }
        scope.launch {
            try {
                // Re-read the authoritative grant set rather than trusting
                // the activity result payload alone — Health Connect's
                // permission model reflects the *current* overall grant
                // state (not just what changed in this one request), and
                // this keeps requestPermissions() and getStatus() reporting
                // from exactly the same source of truth.
                val granted = current.permissionController.getGrantedPermissions()
                call.resolve(statusPayload(available = true, granted = granted))
            } catch (e: Exception) {
                call.reject("Failed to read Health Connect permission state: ${e.message}", "STATUS_FAILED", e)
            }
        }
    }

    @PluginMethod
    fun openSettings(call: PluginCall) {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Unable to open Health Connect settings: ${e.message}", "OPEN_SETTINGS_FAILED", e)
        }
    }

    @PluginMethod
    fun getSteps(call: PluginCall) {
        val startDateStr = call.getString("startDate")
        val endDateStr = call.getString("endDate")
        if (startDateStr.isNullOrBlank() || endDateStr.isNullOrBlank()) {
            call.reject("startDate and endDate (yyyy-MM-dd) are required", "INVALID_ARGS")
            return
        }

        val startDate: LocalDate
        val endDate: LocalDate
        try {
            startDate = LocalDate.parse(startDateStr)
            endDate = LocalDate.parse(endDateStr)
        } catch (e: DateTimeParseException) {
            call.reject("startDate/endDate must be yyyy-MM-dd local dates", "INVALID_DATE", e)
            return
        }
        if (endDate.isBefore(startDate)) {
            call.reject("endDate must not be before startDate", "INVALID_RANGE")
            return
        }

        val current = clientOrNull()
        if (current == null) {
            call.reject("Health Connect is not available on this device", "UNAVAILABLE")
            return
        }

        scope.launch {
            try {
                val granted = current.permissionController.getGrantedPermissions()
                if (!granted.contains(STEPS_PERMISSION)) {
                    call.reject("READ_STEPS permission has not been granted", "PERMISSION_DENIED")
                    return@launch
                }
                val dailyTotals = readDailySteps(current, startDate, endDate)
                val results = JSArray()
                for ((date, steps) in dailyTotals) {
                    results.put(JSObject().put("date", date).put("steps", steps))
                }
                call.resolve(JSObject().put("results", results))
            } catch (e: Exception) {
                call.reject("Failed to read step data from Health Connect: ${e.message}", "READ_FAILED", e)
            }
        }
    }

    /**
     * One `aggregateGroupByPeriod` call over the whole requested range,
     * sliced into 1-day buckets — never raw `StepsRecord` entries summed by
     * hand. `StepsRecord.COUNT_TOTAL` is Health Connect's own aggregate
     * metric: it performs the source de-duplication/priority resolution
     * itself (phone, watch, Samsung Health, any other contributing app),
     * which is exactly why this never filters by `DataOrigin` — as of
     * mid-2026 Health Connect can attribute a phone's own step sensor to a
     * per-device Synthetic Package Name that isn't stable or predictable
     * ahead of time (older records may still carry the historical `android`
     * origin), so hard-coding either would silently exclude real data on
     * some devices/HC versions. The unfiltered aggregate already reflects
     * whatever source-priority resolution Health Connect itself applies.
     *
     * Local-day boundaries only: `startDate`/`endDate` are parsed as plain
     * `LocalDate`s (never `Instant`/UTC), and the filter runs from that
     * date's local midnight to the day *after* `endDate`'s local midnight
     * — never a UTC day boundary.
     *
     * A bucket with no contributing records still comes back from Health
     * Connect with a null `COUNT_TOTAL` (not omitted) — that's coerced to
     * 0 here, a legitimate "no steps recorded that day", never confused
     * with a read failure (which instead throws out of this function).
     */
    private suspend fun readDailySteps(
        healthConnectClient: HealthConnectClient,
        startDate: LocalDate,
        endDate: LocalDate,
    ): List<Pair<String, Long>> {
        val startOfRange = startDate.atStartOfDay()
        val endOfRange = endDate.plusDays(1).atStartOfDay()

        val buckets: List<AggregationResultGroupedByPeriod> = healthConnectClient.aggregateGroupByPeriod(
            AggregateGroupByPeriodRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(startOfRange, endOfRange),
                timeRangeSlicer = Period.ofDays(1),
            ),
        )

        val totalsByDate = mutableMapOf<String, Long>()
        for (bucket in buckets) {
            val date = bucket.startTime.toLocalDate().toString()
            totalsByDate[date] = bucket.result[StepsRecord.COUNT_TOTAL] ?: 0L
        }

        val out = mutableListOf<Pair<String, Long>>()
        var cursor = startDate
        while (!cursor.isAfter(endDate)) {
            val key = cursor.toString()
            out.add(key to (totalsByDate[key] ?: 0L))
            cursor = cursor.plusDays(1)
        }
        return out
    }
}
