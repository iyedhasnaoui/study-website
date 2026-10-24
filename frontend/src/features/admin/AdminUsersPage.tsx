import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../../auth/AuthContext'
import { ROLE_LABELS, type AppRole, type ManagedUser } from '../../auth/types'
import { getApiErrorMessage } from '../../lib/apiClient'
import { RoleBadge } from '../../components/RoleBadge'
import { changeRole, endSessions, listUsers, removeUser, setBanned } from './adminApi'

const ASSIGNABLE_ROLES: AppRole[] = ['VIEWER', 'CONTRIBUTOR']

const actionButton =
  'rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-amber-500/50 dark:hover:text-amber-200'

const dangerButton =
  'rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40'

export function AdminUsersPage() {
  const { isAdmin, isReady, session } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setUsers(await listUsers())
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Unable to load the member list.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isReady && isAdmin) void load()
    else if (isReady) setIsLoading(false)
  }, [isReady, isAdmin, load])

  const run = async (user: ManagedUser, label: string, action: () => Promise<void>) => {
    setBusyId(user.keycloakId)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(`${label} — ${user.username}.`)
      await load()
    } catch (actionError) {
      setError(getApiErrorMessage(actionError, 'That action was refused.'))
    } finally {
      setBusyId(null)
    }
  }

  if (!isReady) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
          Checking your access…
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <strong className="block text-base font-semibold">Administrators only</strong>
          Member management is restricted to administrator accounts.
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600 dark:text-amber-300">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
          Members
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-zinc-400">
          Promote members to contributor so they can publish, or step them back to viewer.
          Administrator accounts are set at deployment and cannot be changed here.
        </p>
      </section>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
          Loading members…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white/95 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.localUserId != null && user.localUserId === session?.user.id
                const busy = busyId === user.keycloakId
                const locked = user.protectedAccount

                return (
                  <tr key={user.keycloakId} className="border-b border-gray-100 last:border-0 dark:border-zinc-900">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-zinc-100">
                        {user.username}
                        {isSelf ? <span className="ml-2 text-xs font-normal text-slate-400">(you)</span> : null}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400">{user.email ?? '—'}</div>
                    </td>

                    <td className="px-4 py-3">
                      {locked ? (
                        <RoleBadge role={user.role} />
                      ) : (
                        <select
                          value={user.role}
                          disabled={busy}
                          onChange={(event) =>
                            run(user, `Role set to ${ROLE_LABELS[event.target.value as AppRole]}`, () =>
                              changeRole(user.keycloakId, event.target.value as AppRole),
                            )
                          }
                          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                        >
                          {ASSIGNABLE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-zinc-400">
                      {user.banned || !user.enabled ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-300">Suspended</span>
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-300">Active</span>
                      )}
                      <span className="ml-2">
                        {user.activeSessions} session{user.activeSessions === 1 ? '' : 's'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {locked ? (
                        <span className="text-xs text-slate-400 dark:text-zinc-500">
                          Managed at deployment
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy || user.activeSessions === 0}
                            onClick={() => run(user, 'Sessions ended', () => endSessions(user.keycloakId))}
                            className={actionButton}
                          >
                            End sessions
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              run(user, user.banned ? 'Reinstated' : 'Suspended', () =>
                                setBanned(user.keycloakId, !user.banned),
                              )
                            }
                            className={actionButton}
                          >
                            {user.banned ? 'Reinstate' : 'Suspend'}
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm(`Remove ${user.username}? This cannot be undone.`)) return
                              void run(user, 'Removed', () => removeUser(user.keycloakId))
                            }}
                            className={dangerButton}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                    No members yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
