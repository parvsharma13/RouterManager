import { HashRouter, Routes, Route } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { CapabilitiesProvider } from '@/context/CapabilitiesContext';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { Devices } from '@/pages/Devices';
import { DeviceDetail } from '@/pages/DeviceDetail';
import { Activity } from '@/pages/Activity';
import { Settings } from '@/pages/Settings';
import { WiFi } from '@/pages/WiFi';
import { Profiles } from '@/pages/Profiles';
import { PortForwarding } from '@/pages/PortForwarding';
import { Ddns } from '@/pages/Ddns';
import { Firewall } from '@/pages/Firewall';
import { Qos } from '@/pages/Qos';
import { Voip } from '@/pages/Voip';
import { Usb } from '@/pages/Usb';
import { System } from '@/pages/System';
import { About } from '@/pages/About';
import { Diagnostics } from '@/pages/Diagnostics';
import { Notifications } from '@/pages/Notifications';
import { NotFound } from '@/pages/NotFound';
import { Login } from '@/pages/Login';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/shared/LoadingState';
import { ThemeProvider } from 'next-themes';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthenticatedApp() {
  const { session, restoring } = useAuth();
  if (restoring) {
    return (
      <main className="grid min-h-dvh place-items-center p-8" aria-label="Restoring session">
        <div className="w-full max-w-sm">
          <LoadingState rows={3} />
        </div>
      </main>
    );
  }
  if (!session) return <Login />;

  return (
    <CapabilitiesProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/devices/:mac" element={<DeviceDetail />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/wifi" element={<WiFi />} />
            <Route path="/settings/profiles" element={<Profiles />} />
            <Route path="/settings/port-forwarding" element={<PortForwarding />} />
            <Route path="/settings/ddns" element={<Ddns />} />
            <Route path="/settings/firewall" element={<Firewall />} />
            <Route path="/settings/qos" element={<Qos />} />
            <Route path="/settings/voip" element={<Voip />} />
            <Route path="/settings/usb" element={<Usb />} />
            <Route path="/settings/system" element={<System />} />
            <Route path="/settings/about" element={<About />} />
            <Route path="/settings/diagnostics" element={<Diagnostics />} />
            <Route path="/settings/notifications" element={<Notifications />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </HashRouter>
      <Toaster />
    </CapabilitiesProvider>
  );
}
