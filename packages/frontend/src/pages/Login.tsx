import { useRef, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Router, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiRequestError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Capacitor } from '@capacitor/core';

export function Login() {
  const { login } = useAuth();
  const [serverUrl, setServerUrl] = useState(() => (Capacitor.isNativePlatform() ? 'https://192.168.1.1' : window.location.origin));
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ serverUrl, username, password });
    } catch (caught) {
      const message = caught instanceof ApiRequestError
        ? caught.message
        : caught instanceof Error
          ? caught.message
          : 'Could not sign in. Check the address and try again.';
      setError(message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,var(--color-accent),transparent_42%)] px-4 py-[max(2rem,env(safe-area-inset-top))] sm:grid sm:place-items-center">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Router aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-xl font-semibold tracking-tight">Router Manager</p>
            <p className="text-sm text-muted-foreground">Your home network, in your pocket</p>
          </div>
        </div>

        <Card className="shadow-xl shadow-foreground/5">
          <CardHeader>
            <h1 className="flex items-center gap-2 text-xl font-semibold leading-none">
              <LockKeyhole aria-hidden="true" className="size-5 text-primary" />
              Sign in
            </h1>
            <CardDescription>Connect directly to your router. No computer or cloud service is required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={submit} noValidate>
              {error ? (
                <div ref={errorRef} role="alert" tabIndex={-1} className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive outline-none focus:ring-2 focus:ring-ring">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="server-url">Router address</Label>
                <Input id="server-url" name="url" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" autoComplete="url" placeholder="https://192.168.1.1" value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} disabled={submitting} className="h-12" required />
                <p className="text-xs leading-5 text-muted-foreground">Your phone must be connected to the router's Wi-Fi.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={submitting} className="h-12" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting} className="h-12 pr-12" required />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting || !serverUrl || !username || !password}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="size-4 text-success" />
          Credentials are protected by Android secure storage
        </p>
      </div>
    </main>
  );
}
