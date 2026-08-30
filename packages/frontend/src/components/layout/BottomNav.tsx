import { NavLink } from 'react-router';
import { NAV_ITEMS } from '@/lib/nav-items';
import { cn } from '@/lib/utils';

export function BottomNav() {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 bg-surface-container pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto grid h-20 max-w-lg grid-cols-4 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'm3-nav-destination relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[0.6875rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {({ isActive }) => (
              <>
                <span className={cn('m3-nav-indicator grid h-8 w-16 place-items-center rounded-full', isActive && 'is-active bg-secondary-container text-secondary-container-foreground')}>
                  <Icon aria-hidden="true" className="size-5" strokeWidth={isActive ? 2.4 : 1.9} />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
