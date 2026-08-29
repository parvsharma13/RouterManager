package com.parvsharma.routermanager;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/**
 * Read-only mirror of @aparajita/capacitor-secure-storage's Android storage (see
 * node_modules/@aparajita/capacitor-secure-storage/android's SecureStorage.java) so
 * DeviceCheckWorker can read the saved router session without a running webview/JS
 * bridge; a background Worker has neither. Same app, same process UID, so the same
 * AndroidKeyStore-backed SharedPreferences entry is readable by this class directly.
 * Writing stays exclusively the plugin's job; this class only ever decrypts.
 */
final class SecureCredentialReader {
  private static final String ANDROID_KEY_STORE = "AndroidKeyStore";
  private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
  private static final String SHARED_PREFERENCES = "WSSecureStorageSharedPreferences";
  private static final String KEY_PREFIX = "capacitor-storage_";
  private static final String SESSION_KEY = KEY_PREFIX + "router-manager-session-v1";
  private static final char DATA_IV_SEPARATOR = '\u0010';
  private static final int BASE64_FLAGS = Base64.NO_PADDING | Base64.NO_WRAP;

  private SecureCredentialReader() {}

  static final class Session {
    final String serverUrl, username, password, fingerprint;
    Session(String serverUrl, String username, String password, String fingerprint) {
      this.serverUrl = serverUrl; this.username = username; this.password = password; this.fingerprint = fingerprint;
    }
  }

  /** Returns null if no session is stored (logged out) or it can't be decrypted. */
  static Session read(Context context) {
    try {
      SharedPreferences prefs = context.getSharedPreferences(SHARED_PREFERENCES, Context.MODE_PRIVATE);
      String stored = prefs.getString(SESSION_KEY, null);
      if (stored == null) return null;

      String[] parts = stored.split(String.valueOf(DATA_IV_SEPARATOR));
      if (parts.length != 2) return null;
      byte[] encrypted = Base64.decode(parts[0], BASE64_FLAGS);
      byte[] iv = Base64.decode(parts[1], BASE64_FLAGS);

      KeyStore keyStore = KeyStore.getInstance(ANDROID_KEY_STORE);
      keyStore.load(null);
      KeyStore.SecretKeyEntry entry = (KeyStore.SecretKeyEntry) keyStore.getEntry(SESSION_KEY, null);
      if (entry == null) return null;
      SecretKey secretKey = entry.getSecretKey();

      Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
      cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(128, iv));
      String json = new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);

      JSONObject session = new JSONObject(json);
      return new Session(
        session.optString("serverUrl", null),
        session.optString("username", null),
        session.optString("password", null),
        session.optString("fingerprint", "")
      );
    } catch (Exception e) {
      return null;
    }
  }
}
