import { LogOut, Router } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useCapabilities } from '@/context/CapabilitiesContext';

export function Header() {
  const { logout } = useAuth();
  const { compatibility } = useCapabilities();
  return (
    <header className="sticky top-0 z-30 flex min-h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center gap-3 bg-surface px-4 pt-[env(safe-area-inset-top)] md:px-6">
      <span className="grid size-10 place-items-center rounded-2xl bg-primary-container text-primary-container-foreground md:hidden">
        <Router aria-hidden="true" className="size-4.5" />
      </span>
      <div className="min-w-0 md:ml-auto">
        <p className="truncate text-sm font-semibold leading-5 md:text-right">{compatibility?.model ?? 'Home network'}</p>
        <p className="truncate text-xs leading-4 text-muted-foreground md:text-right">{compatibility?.firmware ?? 'Connecting directly to your router'}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="ml-auto size-12 md:ml-1" onClick={() => void logout()} aria-label="Sign out">
        <LogOut aria-hidden="true" />
      </Button>
    </header>
  );
}
