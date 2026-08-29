package com.parvsharma.routermanager;

import android.content.Context;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

/** Enqueues or cancels the periodic device/router check. WorkManager persists a periodic
 * job across reboots and app updates on its own (it schedules its own boot receiver), so
 * this is the only place that needs to touch WorkManager scheduling. */
final class DeviceCheckScheduler {
  private static final String UNIQUE_WORK_NAME = "router-manager-device-check";

  private DeviceCheckScheduler() {}

  static void reschedule(Context context, boolean enabled, int intervalMinutes) {
    WorkManager workManager = WorkManager.getInstance(context);
    if (!enabled) {
      workManager.cancelUniqueWork(UNIQUE_WORK_NAME);
      return;
    }
    // 15 minutes is WorkManager's own floor for periodic work; anything shorter is
    // silently clamped by the platform anyway, so clamp here for an honest interval.
    long minutes = Math.max(intervalMinutes, 15);
    Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
    PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(DeviceCheckWorker.class, minutes, TimeUnit.MINUTES)
      .setConstraints(constraints)
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, PeriodicWorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
      .build();
    workManager.enqueueUniquePeriodicWork(UNIQUE_WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request);
  }
}
