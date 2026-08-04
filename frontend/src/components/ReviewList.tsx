import { useState } from 'react'
import { Pencil, Trash2, UserRound } from 'lucide-react'
import type { Review } from '../services/api'
import ReviewForm from './ReviewForm'
import StarRating from './StarRating'

interface ReviewListProps {
  reviews: Review[]
  /** Sirve para decidir qué reseña puede editarse; el backend revalida siempre. */
  currentUserId: string | null
  editingId: string | null
  onStartEdit: (id: string) => void
  onCancelEdit: () => void
  onUpdate: (id: string, rating: number, content: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ReviewList({
  reviews,
  currentUserId,
  editingId,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: ReviewListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-800 px-4 py-10 text-center text-sm text-neutral-500">
        Todavía no hay reseñas de esta película.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => {
        const isOwn = currentUserId !== null && review.author.id === currentUserId
        const edited = review.updatedAt !== review.createdAt

        if (isOwn && editingId === review.id) {
          return (
            <li key={review.id}>
              <ReviewForm
                initialRating={review.rating}
                initialContent={review.content}
                submitLabel="Guardar cambios"
                onSubmit={(rating, content) => onUpdate(review.id, rating, content)}
                onCancel={onCancelEdit}
              />
            </li>
          )
        }

        return (
          <li
            key={review.id}
            className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-400">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-white">{review.author.displayName}</span>
                  {isOwn && (
                    <span className="rounded-full bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Tú
                    </span>
                  )}
                  <StarRating value={review.rating} />
                  <span className="text-xs text-neutral-500">
                    {formatDate(review.createdAt)}
                    {edited && ' · editada'}
                  </span>
                </div>

                <p className="mt-2 whitespace-pre-line text-sm text-neutral-300">
                  {review.content}
                </p>
              </div>

              {isOwn && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onStartEdit(review.id)}
                    aria-label="Editar mi reseña"
                    className="rounded-lg border border-neutral-700 p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(review.id)}
                    disabled={deletingId === review.id}
                    aria-label="Eliminar mi reseña"
                    className="rounded-lg border border-neutral-700 p-2 text-neutral-400 transition-colors hover:border-red-800 hover:bg-red-950 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default ReviewList
