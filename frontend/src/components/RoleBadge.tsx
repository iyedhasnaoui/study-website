import { ROLE_LABELS, type AppRole } from '../auth/types'

const TONE: Record<AppRole, string> = {
  VIEWER: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
  CONTRIBUTOR: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  ADMIN: 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-900',
}

export function RoleBadge({ role, title }: { role: AppRole; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  )
}
