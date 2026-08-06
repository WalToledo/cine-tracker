import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Eye, Loader2, Pencil, Star } from 'lucide-react'
import { ApiError, clearSession, usersApi } from '../services/api'
import type { Profile as ProfileData, ProfileChanges } from '../services/api'
import { translateError } from '../services/errors'

/**
 * Un 401 (cookie caducada) o un 404 (la cuenta ya no existe) dejan la sesión
 * inservible: hay que descartar el usuario guardado y pedir login en vez de
 * mostrar el mensaje del backend.
 */
function isDeadSession(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 404)
}

const inputClass =
  'w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-amber-500'
const labelClass = 'text-sm font-medium text-neutral-300'

function Profile() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ firstName: '', lastName: '', username: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function goToLogin() {
    clearSession()
    navigate('/login', { state: { from: '/profile' } })
  }

  useEffect(() => {
    let active = true

    usersApi
      .getProfile()
      .then((result) => {
        if (active) setProfile(result)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (isDeadSession(err)) {
          clearSession()
          navigate('/login', { state: { from: '/profile' } })
          return
        }
        setError('No se pudo cargar tu perfil')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [navigate])

  function startEditing() {
    if (!profile) return
    setDraft({
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      username: profile.user.username,
    })
    setSaveError(null)
    setSaved(false)
    setEditing(true)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    // Sólo viajan los campos que cambiaron; si no cambió ninguno no hay petición.
    const changes: ProfileChanges = {}
    if (draft.firstName !== profile.user.firstName) changes.firstName = draft.firstName
    if (draft.lastName !== profile.user.lastName) changes.lastName = draft.lastName
    if (draft.username !== profile.user.username) changes.username = draft.username

    if (Object.keys(changes).length === 0) {
      setEditing(false)
      return
    }

    setSaveError(null)
    setSaving(true)

    try {
      const updated = await usersApi.updateProfile(changes)
      setProfile((current) => (current ? { ...current, user: updated } : current))
      setEditing(false)
      setSaved(true)
    } catch (err) {
      if (isDeadSession(err)) {
        goToLogin()
      } else {
        setSaveError(translateError(err, 'No se pudo guardar el perfil'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Cargando" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <p role="alert" className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
        {error ?? 'No se pudo cargar tu perfil'}
      </p>
    )
  }

  const { user, stats } = profile

  const cards = [
    { key: 'watched', label: 'Vistas', value: stats.watched, Icon: Eye },
    { key: 'pending', label: 'Pendientes', value: stats.pending, Icon: Clock },
    { key: 'reviews', label: 'Reseñas', value: stats.reviews, Icon: Star },
  ]

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8">
      {editing ? (
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="firstName" className={labelClass}>
                Nombre
              </label>
              <input
                id="firstName"
                type="text"
                required
                maxLength={50}
                value={draft.firstName}
                onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="lastName" className={labelClass}>
                Apellidos
              </label>
              <input
                id="lastName"
                type="text"
                required
                maxLength={50}
                value={draft.lastName}
                onChange={(event) => setDraft({ ...draft, lastName: event.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className={labelClass}>
              Nombre de usuario
            </label>
            <input
              id="username"
              type="text"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_]+"
              title="Sólo letras, números y guion bajo"
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value })}
              className={inputClass}
            />
          </div>

          {saveError && (
            <p role="alert" className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
              {saveError}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-400"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white">
              Hola, {user.firstName} {user.lastName}
            </h2>
            <p className="mt-1 truncate text-sm text-neutral-400">
              @{user.username} · {user.email}
            </p>
            {saved && (
              <p
                role="status"
                className="mt-3 inline-block rounded-lg bg-emerald-950 px-3 py-2 text-sm text-emerald-300"
              >
                Perfil actualizado
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={startEditing}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Editar perfil
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map(({ key, label, value, Icon }) => (
          <div key={key} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center gap-2 text-neutral-400">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">{label}</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Profile
