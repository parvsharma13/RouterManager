package com.parvsharma.routermanager;

import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle state) {
    registerPlugin(RouterHttpPlugin.class);
    registerPlugin(AppPrefsPlugin.class);
    super.onCreate(state);
    WindowCompat.enableEdgeToEdge(getWindow());
  }
}
