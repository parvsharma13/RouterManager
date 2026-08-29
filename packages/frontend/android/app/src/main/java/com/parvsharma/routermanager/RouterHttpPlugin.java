package com.parvsharma.routermanager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URL;

@CapacitorPlugin(name = "RouterHttp")
public class RouterHttpPlugin extends Plugin {
  private RouterProtocolClient client;

  @PluginMethod public void configure(PluginCall call) {
    try {
      URL url = new URL(call.getString("baseUrl", ""));
      if (!"https".equals(url.getProtocol()) || !RouterProtocolClient.isPrivateHost(url.getHost())) throw new Exception("Use an HTTPS router address on your private home network.");
      String baseUrl = url.getProtocol() + "://" + url.getAuthority();
      client = new RouterProtocolClient(baseUrl, call.getString("username", ""), call.getString("password", ""), call.getString("fingerprint", ""));
      call.resolve();
    } catch (Exception e) { call.reject(message(e), e); }
  }

  @PluginMethod public void login(PluginCall call) { background(call, () -> { client.login(); JSObject out = new JSObject(); out.put("fingerprint", client.getFingerprint()); return out; }); }
  @PluginMethod public void daoGet(PluginCall call) { background(call, () -> wrap(client.daoGet(required(call, "oid")))); }
  @PluginMethod public void daoSet(PluginCall call) { background(call, () -> wrap(client.daoSet(required(call, "oid"), call.getData().get("payload"), call.getString("method", "PUT")))); }
  @PluginMethod public void cgiCall(PluginCall call) { background(call, () -> wrap(client.cgiCall(required(call, "name"), call.getData().has("payload") ? call.getData().get("payload") : null))); }
  @PluginMethod public void logout(PluginCall call) { background(call, () -> { client.logout(); return new JSObject(); }); }

  private void background(PluginCall call, Work work) { new Thread(() -> { try { call.resolve(work.run()); } catch (Exception e) { call.reject(message(e), e); } }).start(); }
  private static String required(PluginCall call, String key) throws Exception { String value = call.getString(key); if (value == null || value.isEmpty()) throw new Exception("Missing " + key); return value; }
  private static JSObject wrap(Object value) { JSObject out = new JSObject(); out.put("data", value); return out; }
  private static String message(Exception e) { return e.getMessage() == null ? "Could not communicate with the router." : e.getMessage(); }
  private interface Work { JSObject run() throws Exception; }
}
