import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  max?: number
  /** Sin `onChange` el componente se renderiza en modo lectura. */
  onChange?: (value: number) => void
  disabled?: boolean
}

function StarRating({ value, max = 5, onChange, disabled = false }: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, index) => index + 1)

  if (!onChange) {
    return (
      <span className="flex items-center gap-0.5" aria-label={`${value} de ${max} estrellas`}>
        {stars.map((star) => (
          <Star
            key={star}
            aria-hidden="true"
            className={`h-4 w-4 ${
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-600'
            }`}
          />
        ))}
      </span>
    )
  }

  return (
    <span role="group" aria-label="Puntuación" className="flex items-center gap-0.5">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          disabled={disabled}
          aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
          aria-pressed={star === value}
          className="rounded p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Star
            aria-hidden="true"
            className={`h-6 w-6 ${
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-600'
            }`}
          />
        </button>
      ))}
    </span>
  )
}

export default StarRating
