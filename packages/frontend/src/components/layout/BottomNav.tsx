import { NavLink } from 'react-router';
import { NAV_ITEMS } from '@/lib/nav-items';
import { cn } from '@/lib/utils';

export function BottomNav() {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(15_23_42/0.06)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid h-20 max-w-lg grid-cols-4 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[0.6875rem] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {({ isActive }) => (
              <>
                <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-primary/12')}>
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
