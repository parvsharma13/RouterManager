package com.parvsharma.routermanager;

import android.annotation.SuppressLint;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.cert.X509Certificate;
import java.security.spec.X509EncodedKeySpec;
import java.util.List;
import java.util.Map;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.net.ssl.*;

/**
 * The encrypted Zyxel RSA/AES login + DAL protocol (see docs/api-notes.md), with no
 * Capacitor dependency so it can run unchanged from both RouterHttpPlugin (the JS-facing
 * bridge) and DeviceCheckWorker (a background WorkManager job with no webview/JS runtime).
 * RouterHttpPlugin owns the only long-lived instance used by the UI; a Worker creates its
 * own short-lived instance per run instead of sharing session state across processes.
 */
public class RouterProtocolClient {
  private final String baseUrl, username, password;
  private String fingerprint, cookie, csrf;
  private byte[] aesKey;
  private long establishedAt;
  private final SecureRandom random = new SecureRandom();

  public RouterProtocolClient(String baseUrl, String username, String password, String fingerprint) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
    this.fingerprint = fingerprint;
  }

  public String getFingerprint() { return fingerprint; }

  public void login() throws Exception { doLogin(); }
  public Object daoGet(String oid) throws Exception {
    ensureSession();
    // A full-OID read must not set DalGetOneObject. On Hyperoptic's ABVY.4 firmware,
    // that flag means "read one selected instance" and requires an additional selector;
    // sending it by itself makes the router return its misspelled "Missing Arguement".
    // The stock router UI uses the plain oid form for the same status/wlan/lanhosts reads.
    String path = "/cgi-bin/DAL?oid=" + URLEncoder.encode(oid, "UTF-8");
    return decryptResponse(request(path, "GET", null, true), oid);
  }
  public Object daoSet(String oid, Object payload, String method) throws Exception {
    ensureSession();
    String path = "/cgi-bin/DAL?oid=" + URLEncoder.encode(oid, "UTF-8");
    return decryptResponse(request(path, method, envelope(payload), true), oid);
  }
  public Object cgiCall(String name, Object payload) throws Exception {
    ensureSession();
    return decryptResponse(request("/cgi-bin/" + name, "POST", payload == null ? null : envelope(payload), true), name);
  }
  public void logout() throws Exception {
    try { if (cookie != null) request("/cgi-bin/UserLogout", "GET", null, true); } finally { clearSession(); }
  }

  private void doLogin() throws Exception {
    String pem = new JSONObject(request("/getRSAPublickKey", "GET", null, false).body).getString("RSAPublicKey");
    JSONObject login = new JSONObject();
    login.put("Input_Account", username);
    login.put("Input_Passwd", b64(password.getBytes(StandardCharsets.UTF_8)));
    login.put("currLang", "en");
    login.put("RememberPassword", 0);
    login.put("SHA512_password", "");
    aesKey = bytes(32);
    byte[] iv = bytes(32);
    JSONObject body = new JSONObject();
    body.put("content", encrypt(login.toString(), aesKey, iv));
    body.put("iv", b64(iv));
    body.put("key", rsa(b64(aesKey), pem));
    Raw response = request("/UserLogin", "POST", body.toString(), false);
    JSONObject encrypted = new JSONObject(response.body);
    if (!encrypted.has("content") || response.setCookie == null) throw new Exception("The router rejected the login.");
    JSONObject clear = new JSONObject(decrypt(encrypted.getString("content"), aesKey, decode64(encrypted.getString("iv"))));
    if (!"ZCFG_SUCCESS".equals(clear.optString("result"))) throw new Exception("Incorrect router username or password.");
    cookie = response.setCookie;
    csrf = clear.getString("sessionkey");
    establishedAt = System.currentTimeMillis();
  }

  private void ensureSession() throws Exception { if (aesKey == null || System.currentTimeMillis() - establishedAt > 480000) doLogin(); }
  private String envelope(Object payload) throws Exception { byte[] iv = bytes(32); JSONObject out = new JSONObject(); out.put("content", encrypt(payload.toString(), aesKey, iv)); out.put("iv", b64(iv)); return out.toString(); }
  private Object decryptResponse(Raw response, String feature) throws Exception {
    JSONObject parsed = new JSONObject(response.body); Object value = parsed;
    if (parsed.has("content") && parsed.has("iv")) { String clear = decrypt(parsed.getString("content"), aesKey, decode64(parsed.getString("iv"))); value = clear.trim().startsWith("[") ? new JSONArray(clear) : new JSONObject(clear); }
    if (value instanceof JSONObject) { String result = ((JSONObject) value).optString("result"); if (!result.isEmpty() && !"ZCFG_SUCCESS".equals(result)) throw new Exception("Router feature unavailable: " + feature); }
    return value;
  }

  private Raw request(String path, String method, String body, boolean auth) throws Exception {
    URL url = new URL(baseUrl + path);
    if (!isPrivate(url.getHost())) throw new Exception("Router address is not private.");
    SSLContext context = SSLContext.getInstance("TLS");
    context.init(null, new TrustManager[]{new LocalTrust()}, random);
    HttpsURLConnection c = (HttpsURLConnection) url.openConnection();
    c.setSSLSocketFactory(context.getSocketFactory());
    c.setHostnameVerifier((h, s) -> true);
    c.setConnectTimeout(15000);
    c.setReadTimeout(15000);
    c.setRequestMethod(method);
    c.setRequestProperty("Accept", "application/json");
    if (auth) { c.setRequestProperty("Cookie", cookie); c.setRequestProperty("CSRFToken", csrf); }
    if (body != null) { c.setDoOutput(true); c.setRequestProperty("Content-Type", "application/json"); try (OutputStream out = c.getOutputStream()) { out.write(body.getBytes(StandardCharsets.UTF_8)); } }
    int status = c.getResponseCode();
    String observed = fingerprint((X509Certificate) c.getServerCertificates()[0]);
    if (fingerprint != null && !fingerprint.isEmpty() && !fingerprint.equals(observed)) throw new Exception("The router security certificate changed. Reconnect only if you expect this change.");
    if (fingerprint == null || fingerprint.isEmpty()) fingerprint = observed;
    String setCookie = null;
    for (Map.Entry<String, List<String>> h : c.getHeaderFields().entrySet()) if (h.getKey() != null && h.getKey().equalsIgnoreCase("set-cookie") && !h.getValue().isEmpty()) { setCookie = h.getValue().get(0).split(";", 2)[0]; break; }
    String response = read(status >= 400 ? c.getErrorStream() : c.getInputStream());
    if (status >= 400) throw new Exception("Router returned HTTP " + status + ".");
    return new Raw(response, setCookie);
  }

  private static String encrypt(String value, byte[] key, byte[] iv) throws Exception { Cipher c = Cipher.getInstance("AES/CBC/PKCS5Padding"); c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv, 0, 16)); return b64(c.doFinal(value.getBytes(StandardCharsets.UTF_8))); }
  private static String decrypt(String value, byte[] key, byte[] iv) throws Exception { Cipher c = Cipher.getInstance("AES/CBC/PKCS5Padding"); c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv, 0, 16)); return new String(c.doFinal(decode64(value)), StandardCharsets.UTF_8); }
  private static String rsa(String value, String pem) throws Exception { String raw = pem.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").replaceAll("\\s", ""); PublicKey key = KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(decode64(raw))); Cipher c = Cipher.getInstance("RSA/ECB/PKCS1Padding"); c.init(Cipher.ENCRYPT_MODE, key); return b64(c.doFinal(value.getBytes(StandardCharsets.UTF_8))); }
  private byte[] bytes(int n) { byte[] value = new byte[n]; random.nextBytes(value); return value; }
  private static byte[] decode64(String value) { return Base64.decode(value, Base64.DEFAULT); }
  private static String b64(byte[] value) { return Base64.encodeToString(value, Base64.NO_WRAP); }
  private static String read(InputStream stream) throws Exception { if (stream == null) return ""; StringBuilder out = new StringBuilder(); try (BufferedReader r = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) { String line; while ((line = r.readLine()) != null) out.append(line); } return out.toString(); }
  public static boolean isPrivateHost(String host) throws Exception { InetAddress a = InetAddress.getByName(host); byte[] b = a.getAddress(); return a.isLoopbackAddress() || a.isLinkLocalAddress() || a.isSiteLocalAddress() || (b.length == 16 && (b[0] & 0xfe) == 0xfc); }
  private static boolean isPrivate(String host) throws Exception { return isPrivateHost(host); }
  private static String fingerprint(X509Certificate cert) throws Exception { byte[] digest = MessageDigest.getInstance("SHA-256").digest(cert.getEncoded()); StringBuilder out = new StringBuilder(); for (byte b : digest) { if (out.length() > 0) out.append(':'); out.append(String.format("%02X", b)); } return out.toString(); }
  private void clearSession() { aesKey = null; cookie = null; csrf = null; establishedAt = 0; }

  static class Raw { final String body, setCookie; Raw(String body, String setCookie) { this.body = body; this.setCookie = setCookie; } }
  // Hyperhubs use a self-signed certificate. Trust is established on first use and every
  // later request is pinned to its SHA-256 fingerprint in request(); a changed certificate
  // is rejected before response data is accepted.
  @SuppressLint({"CustomX509TrustManager", "TrustAllX509TrustManager"})
  private static class LocalTrust implements X509TrustManager { public void checkClientTrusted(X509Certificate[] c, String a) {} public void checkServerTrusted(X509Certificate[] c, String a) {} public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; } }
}
