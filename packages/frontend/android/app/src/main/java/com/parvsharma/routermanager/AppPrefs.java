package com.parvsharma.routermanager;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Plain (unencrypted) native prefs for notification settings and the background device
 * checker's own bookkeeping — nothing stored here is sensitive (booleans, an interval, MAC
 * addresses, a reachability flag), unlike the router credentials in SecureCredentialReader.
 * Written by AppPrefsPlugin (mirroring what the JS side already persists in its own
 * encrypted SQLite store) and read by DeviceCheckWorker, which has no JS/webview to call
 * back into for that data.
 */
final class AppPrefs {
  static final String PREFS_NAME = "router_manager_prefs";
  static final String KEY_NEW_DEVICES = "new_devices";
  static final String KEY_ROUTER_OFFLINE = "router_offline";
  static final String KEY_BACKGROUND_CHECKS = "background_checks";
  static final String KEY_INTERVAL_MINUTES = "interval_minutes";
  static final String KEY_KNOWN_MACS = "known_macs";
  static final String KEY_LAST_REACHABLE = "last_reachable";
  static final String KEY_OFFLINE_STREAK = "offline_streak";

  private AppPrefs() {}

  static SharedPreferences get(Context context) {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
  }
}
