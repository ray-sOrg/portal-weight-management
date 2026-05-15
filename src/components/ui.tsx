import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  return (
    <button
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 md:h-10',
        variant === 'primary' &&
          'bg-sage-dark text-white shadow-sm hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-dark',
        variant === 'secondary' &&
          'border border-line bg-white text-ink hover:border-sage hover:bg-mist',
        variant === 'ghost' && 'text-sage-dark hover:bg-mist',
        className,
      )}
      {...props}
    />
  )
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-md border border-line bg-white px-3 text-base text-ink outline-none transition placeholder:text-sage/70 focus:border-sage focus:ring-2 focus:ring-mint/50 md:h-10 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export function Label({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('text-xs font-semibold uppercase tracking-[0.08em] text-sage-dark', className)}>
      {children}
    </label>
  )
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-lg border border-line bg-white/88 p-4 shadow-[0_18px_60px_rgba(33,45,40,0.07)] backdrop-blur sm:p-5', className)}>
      {children}
    </section>
  )
}

export function Stat({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string
  value: string
  detail?: string
  tone?: 'default' | 'good' | 'warn'
}) {
  return (
    <div className="rounded-md border border-line bg-white p-3 shadow-sm md:border-l md:border-y-0 md:border-r-0 md:bg-transparent md:p-0 md:pl-4 md:shadow-none md:first:border-l-0 md:first:pl-0">
      <p className="text-xs font-medium text-sage-dark">{label}</p>
      <p
        className={cn(
          'mt-1 text-[1.65rem] font-semibold leading-none tabular-nums text-ink md:text-2xl md:leading-normal',
          tone === 'good' && 'text-sage-dark',
          tone === 'warn' && 'text-coral',
        )}
      >
        {value}
      </p>
      {detail ? <p className="mt-2 text-xs leading-4 text-sage md:mt-1">{detail}</p> : null}
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-mist/70 px-6 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-sage">{body}</p>
    </div>
  )
}
