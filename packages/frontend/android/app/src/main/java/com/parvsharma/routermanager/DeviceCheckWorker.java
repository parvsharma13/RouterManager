package com.parvsharma.routermanager;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Periodic WorkManager job (scheduled by AppPrefsPlugin/DeviceCheckScheduler when the user
 * turns on background checks in Settings). Logs into the router with the same encrypted
 * protocol the app uses in the foreground, then raises a plain Android notification for a
 * newly joined device or a change in router reachability. It never writes to the app's own
 * SQLite event history; the JS side re-derives those events independently the next time
 * it fetches /devices, so this stays a lightweight alerting job, not a second data store.
 */
public class DeviceCheckWorker extends Worker {
  private static final String CHANNEL_ID = "router-manager-network";
  private static final int NOTIFICATION_ID_NEW_DEVICE = 1001;
  private static final int NOTIFICATION_ID_ROUTER_STATE = 1002;
  // Require two consecutive failed logins before alerting "router unreachable": a phone
  // that just stepped off its home Wi-Fi will fail once almost immediately, and that alone
  // isn't a fault worth surfacing.
  private static final int OFFLINE_STREAK_THRESHOLD = 2;

  public DeviceCheckWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  @NonNull
  @Override
  public Result doWork() {
    Context context = getApplicationContext();
    SharedPreferences prefs = AppPrefs.get(context);
    if (!prefs.getBoolean(AppPrefs.KEY_BACKGROUND_CHECKS, false)) return Result.success();

    SecureCredentialReader.Session session = SecureCredentialReader.read(context);
    if (session == null || session.serverUrl == null || session.username == null || session.password == null) {
      return Result.success(); // signed out: nothing to check
    }

    boolean notifyNewDevices = prefs.getBoolean(AppPrefs.KEY_NEW_DEVICES, true);
    boolean notifyRouterOffline = prefs.getBoolean(AppPrefs.KEY_ROUTER_OFFLINE, true);
    boolean wasReachable = prefs.getBoolean(AppPrefs.KEY_LAST_REACHABLE, true);

    RouterProtocolClient client = new RouterProtocolClient(session.serverUrl, session.username, session.password, session.fingerprint);
    try {
      client.login();
      if (!wasReachable && notifyRouterOffline) {
        notify(context, NOTIFICATION_ID_ROUTER_STATE, "Router back online", "Your Hyperoptic router is reachable again.");
      }
      prefs.edit().putInt(AppPrefs.KEY_OFFLINE_STREAK, 0).putBoolean(AppPrefs.KEY_LAST_REACHABLE, true).apply();
    } catch (Exception loginFailure) {
      int streak = prefs.getInt(AppPrefs.KEY_OFFLINE_STREAK, 0) + 1;
      SharedPreferences.Editor editor = prefs.edit().putInt(AppPrefs.KEY_OFFLINE_STREAK, streak);
      if (streak >= OFFLINE_STREAK_THRESHOLD) {
        if (wasReachable && notifyRouterOffline) {
          notify(context, NOTIFICATION_ID_ROUTER_STATE, "Router unreachable", "Router Manager couldn't reach your router on the last two checks.");
        }
        editor.putBoolean(AppPrefs.KEY_LAST_REACHABLE, false);
      }
      editor.apply();
      return Result.success();
    }

    if (notifyNewDevices) {
      try {
        checkForNewDevices(context, prefs, client);
      } catch (Exception ignored) {
        // Best-effort: a parsing hiccup here shouldn't fail the whole periodic job.
      }
    }
    return Result.success();
  }

  private void checkForNewDevices(Context context, SharedPreferences prefs, RouterProtocolClient client) throws Exception {
    JSONArray hosts = extractHosts(client.daoGet("lanhosts"));
    if (hosts == null) return;

    boolean seededBefore = prefs.contains(AppPrefs.KEY_KNOWN_MACS);
    Set<String> known = new HashSet<>(prefs.getStringSet(AppPrefs.KEY_KNOWN_MACS, new HashSet<>()));
    List<String> newlyFound = new ArrayList<>();

    for (int i = 0; i < hosts.length(); i++) {
      JSONObject host = hosts.optJSONObject(i);
      if (host == null) continue;
      String mac = host.optString("PhysAddress", null);
      if (mac == null || mac.isEmpty() || known.contains(mac)) continue;
      known.add(mac);
      if (seededBefore && host.optBoolean("Active", false)) newlyFound.add(host.optString("HostName", mac));
    }

    prefs.edit().putStringSet(AppPrefs.KEY_KNOWN_MACS, known).apply();

    if (!newlyFound.isEmpty()) {
      String body = newlyFound.size() == 1
        ? newlyFound.get(0) + " joined your network"
        : newlyFound.size() + " new devices joined your network";
      notify(context, NOTIFICATION_ID_NEW_DEVICE, "New device", body);
    }
  }

  private JSONArray extractHosts(Object raw) {
    try {
      if (!(raw instanceof JSONObject)) return null;
      JSONArray objects = ((JSONObject) raw).optJSONArray("Object");
      if (objects == null || objects.length() == 0) return null;
      return objects.getJSONObject(0).optJSONArray("lanhosts");
    } catch (Exception e) {
      return null;
    }
  }

  private void notify(Context context, int id, String title, String body) {
    ensureChannel(context);
    Intent launch = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_IMMUTABLE : 0);
    PendingIntent contentIntent = PendingIntent.getActivity(context, id, launch, flags);
    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(body)
      .setAutoCancel(true)
      .setContentIntent(contentIntent)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT);
    try {
      NotificationManagerCompat.from(context).notify(id, builder.build());
    } catch (SecurityException ignored) {
      // Permission was revoked between the last check and now: nothing more to do here.
    }
  }

  private void ensureChannel(Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationManager manager = context.getSystemService(NotificationManager.class);
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return;
    NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Network status", NotificationManager.IMPORTANCE_DEFAULT);
    channel.setDescription("New devices and router reachability changes.");
    manager.createNotificationChannel(channel);
  }
}
