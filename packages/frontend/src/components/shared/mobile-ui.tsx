import type { ReactNode } from 'react';
import { AlertTriangle, ChevronRight, CircleCheck, CircleX, FlaskConical, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { useCapabilities } from '@/context/CapabilitiesContext';

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: string; action?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-7 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm font-semibold leading-5 text-primary">{eyebrow}</p>}
        <h1 className="text-[1.75rem] font-semibold leading-9 tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[70ch] text-sm leading-6 text-on-surface-variant">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('overflow-hidden rounded-2xl bg-surface-container-low', className)}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-2 flex min-h-10 items-center justify-between gap-3 px-1"><h2 className="text-sm font-semibold leading-5 text-on-surface-variant">{children}</h2>{action}</div>;
}

export function SettingsRow({ icon: Icon, title, detail, value, to, badge, disabled = false, onClick }: { icon: LucideIcon; title: string; detail?: string; value?: string; to?: string; badge?: ReactNode; disabled?: boolean; onClick?: () => void }) {
  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary-container text-secondary-container-foreground"><Icon aria-hidden="true" className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[0.9375rem] font-semibold"><span className="truncate">{title}</span>{badge}</span>
        {detail && <span className="mt-0.5 block text-xs leading-5 text-on-surface-variant">{detail}</span>}
      </span>
      {value && <span className="max-w-[35%] truncate text-right text-sm text-on-surface-variant">{value}</span>}
      {(to || onClick) && <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground/70" />}
    </>
  );
  const classes = cn('flex min-h-[72px] w-full items-center gap-3 border-b border-outline-variant px-4 py-3 text-left last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', disabled ? 'cursor-not-allowed opacity-[0.38]' : 'transition-colors duration-150 hover:bg-on-surface/8 active:bg-on-surface/12');
  if (to && !disabled) return <Link to={to} className={classes}>{content}</Link>;
  if (onClick) return <button type="button" className={classes} onClick={onClick} disabled={disabled}>{content}</button>;
  return <div className={classes}>{content}</div>;
}

export function StatusPill({ state, children }: { state: 'success' | 'warning' | 'error' | 'neutral'; children: ReactNode }) {
  return <span className={cn('inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold', state === 'success' && 'bg-success/14 text-success', state === 'warning' && 'bg-warning/16 text-warning', state === 'error' && 'bg-destructive/14 text-destructive', state === 'neutral' && 'bg-surface-container-highest text-on-surface-variant')}>{children}</span>;
}

export function CapabilityLabel({ write }: { write: 'verified' | 'experimental' | 'blocked' | 'not-applicable' }) {
  if (write === 'verified') return <StatusPill state="success">Verified control</StatusPill>;
  if (write === 'experimental') return <StatusPill state="warning">Experimental</StatusPill>;
  return <StatusPill state="neutral">Read only</StatusPill>;
}

export function CompatibilityBanner() {
  const { compatibility, loading } = useCapabilities();
  if (loading || !compatibility || compatibility.supportLevel === 'verified') return null;
  const unsupported = compatibility.supportLevel === 'unsupported';
  return (
    <Link to="/settings/about" className={cn('flex min-h-14 items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-6', unsupported ? 'bg-destructive/12 text-destructive' : 'bg-warning/14 text-foreground')}>
      {unsupported ? <CircleX aria-hidden="true" className="size-5 shrink-0" /> : <FlaskConical aria-hidden="true" className="size-5 shrink-0 text-warning" />}
      <span className="flex-1">{unsupported ? 'Unsupported router: controls disabled' : 'Experimental router: read-only mode'}</span>
      <ChevronRight aria-hidden="true" className="size-5" />
    </Link>
  );
}

export function InlineNotice({ tone = 'warning', title, children }: { tone?: 'warning' | 'success' | 'error'; title: string; children: ReactNode }) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'error' ? CircleX : AlertTriangle;
  return <div className={cn('flex gap-3 rounded-2xl p-4 text-sm', tone === 'warning' && 'bg-warning/12', tone === 'success' && 'bg-success/12', tone === 'error' && 'bg-destructive/12')}><Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', tone === 'warning' && 'text-warning', tone === 'success' && 'text-success', tone === 'error' && 'text-destructive')} /><div><p className="font-semibold">{title}</p><div className="mt-1 leading-5 text-on-surface-variant">{children}</div></div></div>;
}
