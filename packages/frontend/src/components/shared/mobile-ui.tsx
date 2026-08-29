import type { ReactNode } from 'react';
import { AlertTriangle, ChevronRight, CircleCheck, CircleX, FlaskConical, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { useCapabilities } from '@/context/CapabilitiesContext';

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: string; action?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.035em] sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(15_23_42/0.04)]', className)}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-3 flex min-h-8 items-center justify-between gap-3"><h2 className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">{children}</h2>{action}</div>;
}

export function SettingsRow({ icon: Icon, title, detail, value, to, badge, disabled = false, onClick }: { icon: LucideIcon; title: string; detail?: string; value?: string; to?: string; badge?: ReactNode; disabled?: boolean; onClick?: () => void }) {
  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Icon aria-hidden="true" className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[0.9375rem] font-semibold"><span className="truncate">{title}</span>{badge}</span>
        {detail && <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{detail}</span>}
      </span>
      {value && <span className="max-w-[35%] truncate text-right text-sm text-muted-foreground">{value}</span>}
      {(to || onClick) && <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground/70" />}
    </>
  );
  const classes = cn('flex min-h-16 w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', disabled ? 'cursor-not-allowed opacity-55' : 'transition-colors hover:bg-accent/65');
  if (to && !disabled) return <Link to={to} className={classes}>{content}</Link>;
  if (onClick) return <button type="button" className={classes} onClick={onClick} disabled={disabled}>{content}</button>;
  return <div className={classes}>{content}</div>;
}

export function StatusPill({ state, children }: { state: 'success' | 'warning' | 'error' | 'neutral'; children: ReactNode }) {
  return <span className={cn('inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold', state === 'success' && 'bg-success/12 text-success', state === 'warning' && 'bg-warning/15 text-warning', state === 'error' && 'bg-destructive/12 text-destructive', state === 'neutral' && 'bg-secondary text-muted-foreground')}>{children}</span>;
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
    <Link to="/settings/about" className={cn('flex min-h-12 items-center gap-3 border-b px-4 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-6', unsupported ? 'bg-destructive/10 text-destructive' : 'bg-warning/12 text-foreground')}>
      {unsupported ? <CircleX aria-hidden="true" className="size-5 shrink-0" /> : <FlaskConical aria-hidden="true" className="size-5 shrink-0 text-warning" />}
      <span className="flex-1">{unsupported ? 'Unsupported router: controls disabled' : 'Experimental router: read-only mode'}</span>
      <ChevronRight aria-hidden="true" className="size-5" />
    </Link>
  );
}

export function InlineNotice({ tone = 'warning', title, children }: { tone?: 'warning' | 'success' | 'error'; title: string; children: ReactNode }) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'error' ? CircleX : AlertTriangle;
  return <div className={cn('flex gap-3 rounded-2xl border p-4 text-sm', tone === 'warning' && 'border-warning/25 bg-warning/8', tone === 'success' && 'border-success/25 bg-success/8', tone === 'error' && 'border-destructive/25 bg-destructive/8')}><Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', tone === 'warning' && 'text-warning', tone === 'success' && 'text-success', tone === 'error' && 'text-destructive')} /><div><p className="font-bold">{title}</p><div className="mt-1 leading-5 text-muted-foreground">{children}</div></div></div>;
}
