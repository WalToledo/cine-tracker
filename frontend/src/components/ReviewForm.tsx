import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import StarRating from './StarRating'

const MAX_CONTENT_LENGTH = 2000

interface ReviewFormProps {
  /** Valores iniciales al editar una reseña existente. */
  initialRating?: number
  initialContent?: string
  submitLabel: string
  onSubmit: (rating: number, content: string) => Promise<void>
  onCancel?: () => void
}

function ReviewForm({
  initialRating = 0,
  initialContent = '',
  submitLabel,
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialRating)
  const [content, setContent] = useState(initialContent)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (rating < 1) {
      setError('Elige una puntuación de 1 a 5 estrellas')
      return
    }

    if (content.trim() === '') {
      setError('Escribe tu reseña antes de publicarla')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      await onSubmit(rating, content.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la reseña')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-300">Tu puntuación</span>
        <StarRating value={rating} onChange={setRating} disabled={submitting} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-content" className="text-sm font-medium text-neutral-300">
          Tu reseña
        </label>
        <textarea
          id="review-content"
          rows={4}
          maxLength={MAX_CONTENT_LENGTH}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="¿Qué te pareció la película?"
          className="w-full resize-y rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-amber-500"
        />
        <span className="text-right text-xs text-neutral-500">
          {content.length}/{MAX_CONTENT_LENGTH}
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-400"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitLabel}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

export default ReviewForm
