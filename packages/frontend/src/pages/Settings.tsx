import { Bell, Cog, Globe, Info, Phone, Radio, Router, ShieldCheck, Sliders, Usb, User, Users, Wifi } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { PageHeader, SectionTitle, SettingsRow, Surface, CapabilityLabel } from '@/components/shared/mobile-ui';
import { useCapabilities } from '@/context/CapabilitiesContext';
import { useAuth } from '@/context/AuthContext';

const THEME_OPTIONS = ['light', 'system', 'dark'] as const;

export function Settings() {
  const { capability } = useCapabilities();
  const { theme, setTheme } = useTheme();
  const { session, logout } = useAuth();

  return (
    <div>
      <PageHeader
        eyebrow="Router Manager"
        title="Settings"
        description={session?.serverUrl ? `Connected to ${session.serverUrl.replace(/^https?:\/\//, '')}` : 'Manage your network, profiles, and app preferences.'}
      />

      <div className="space-y-7">
        <div>
          <SectionTitle>Network</SectionTitle>
          <Surface>
            <SettingsRow icon={Wifi} title="Wi-Fi" detail="Network name, password, and bands" to="/settings/wifi" badge={<CapabilityLabel write={capability('wlan').write} />} />
            <SettingsRow icon={Users} title="Profiles" detail="Group devices, pause and schedule internet" to="/settings/profiles" />
            <SettingsRow icon={Globe} title="Port forwarding" to="/settings/port-forwarding" badge={<CapabilityLabel write={capability('nat').write} />} />
            <SettingsRow icon={Radio} title="Dynamic DNS" to="/settings/ddns" badge={<CapabilityLabel write={capability('dns').write} />} />
            <SettingsRow icon={ShieldCheck} title="Firewall & security" to="/settings/firewall" badge={<CapabilityLabel write={capability('firewall_acl').write} />} />
            <SettingsRow icon={Sliders} title="Quality of service" to="/settings/qos" badge={<CapabilityLabel write={capability('qos').write} />} />
          </Surface>
        </div>

        <div>
          <SectionTitle>Connected services</SectionTitle>
          <Surface>
            <SettingsRow icon={Phone} title="VoIP" detail="Hyperoptic phone line" to="/settings/voip" badge={<CapabilityLabel write={capability('sip_account').write} />} />
            <SettingsRow icon={Usb} title="USB" to="/settings/usb" badge={<CapabilityLabel write={capability('usb_info').write} />} />
          </Surface>
        </div>

        <div>
          <SectionTitle>Router</SectionTitle>
          <Surface>
            <SettingsRow icon={Info} title="About & compatibility" detail="Model, firmware, supported features" to="/settings/about" />
            <SettingsRow icon={Router} title="Network diagnostics" detail="Check connectivity and DNS" to="/settings/diagnostics" />
            <SettingsRow icon={User} title="Administrator" detail="Reboot, change password" to="/settings/system" />
          </Surface>
        </div>

        <div>
          <SectionTitle>App</SectionTitle>
          <Surface>
            <SettingsRow icon={Bell} title="Notifications" detail="New devices, router offline alerts" to="/settings/notifications" />
            <div className="flex min-h-16 items-center gap-3 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Cog aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold">Appearance</span>
              <div role="radiogroup" aria-label="Theme" className="flex gap-1 rounded-full border p-1">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={theme === option}
                    onClick={() => setTheme(option)}
                    className={cn(
                      'min-h-8 rounded-full px-3 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      theme === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </Surface>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="flex min-h-14 w-full items-center justify-center rounded-2xl border text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign out
        </button>
        <p className="pb-2 text-center text-xs text-muted-foreground">Router Manager · local-only, no cloud account</p>
      </div>
    </div>
  );
}
