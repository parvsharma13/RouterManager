package com.parvsharma.routermanager;

import android.Manifest;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Native-side mirror of the notification preferences the JS layer keeps in its own
 * encrypted SQLite store (see local-data.ts), plus the Android 13+ notification
 * permission dance. DeviceCheckWorker (a background WorkManager job with no webview)
 * reads what this plugin writes; there's no other way for it to see these settings.
 */
@CapacitorPlugin(
  name = "AppPrefs",
  permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class AppPrefsPlugin extends Plugin {

  @PluginMethod
  public void setNotificationPrefs(PluginCall call) {
    boolean newDevices = Boolean.TRUE.equals(call.getBoolean("newDevices", true));
    boolean routerOffline = Boolean.TRUE.equals(call.getBoolean("routerOffline", true));
    boolean backgroundChecks = Boolean.TRUE.equals(call.getBoolean("backgroundChecks", false));
    int intervalMinutes = call.getInt("intervalMinutes", 30);

    SharedPreferences.Editor editor = AppPrefs.get(getContext()).edit();
    editor.putBoolean(AppPrefs.KEY_NEW_DEVICES, newDevices);
    editor.putBoolean(AppPrefs.KEY_ROUTER_OFFLINE, routerOffline);
    editor.putBoolean(AppPrefs.KEY_BACKGROUND_CHECKS, backgroundChecks);
    editor.putInt(AppPrefs.KEY_INTERVAL_MINUTES, intervalMinutes);
    editor.apply();

    DeviceCheckScheduler.reschedule(getContext(), backgroundChecks, intervalMinutes);
    call.resolve();
  }

  @PluginMethod
  public void requestNotificationPermission(PluginCall call) {
    if (Build.VERSION.SDK_INT < 33) {
      JSObject out = new JSObject();
      out.put("granted", true);
      call.resolve(out);
      return;
    }
    if (getPermissionState("notifications") == PermissionState.GRANTED) {
      JSObject out = new JSObject();
      out.put("granted", true);
      call.resolve(out);
      return;
    }
    requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
  }

  @PermissionCallback
  private void notificationPermissionCallback(PluginCall call) {
    JSObject out = new JSObject();
    out.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
    call.resolve(out);
  }
}
