import { useEffect, useState } from 'react'

/**
 * Retrasa la propagación de un valor que cambia con cada pulsación. El buscador
 * lo usa para no disparar una petición a TMDB por letra tecleada: sólo la
 * última pulsación de una ráfaga llega al efecto que consulta la API.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)

    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}
