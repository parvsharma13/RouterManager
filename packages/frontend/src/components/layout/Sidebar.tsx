import { NavLink } from 'react-router';
import { Router } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/nav-items';

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col border-r bg-card px-2 py-5 md:flex lg:w-64 lg:px-4">
      <div className="mb-8 flex h-12 items-center justify-center gap-3 lg:justify-start lg:px-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-primary text-primary-foreground shadow-sm shadow-primary/20">
          <Router aria-hidden="true" className="size-5" />
        </span>
        <div className="hidden min-w-0 lg:block">
          <p className="truncate font-bold tracking-tight">Router Manager</p>
          <p className="text-xs text-muted-foreground">Hyperoptic companion</p>
        </div>
      </div>
      <nav aria-label="Primary" className="flex flex-col gap-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-h-12 items-center justify-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:justify-start',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
      <p className="mt-auto hidden px-3 text-xs leading-5 text-muted-foreground lg:block">Local connection<br />No cloud relay</p>
    </aside>
  );
}
