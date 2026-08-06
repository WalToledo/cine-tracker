import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PasswordStrength from './PasswordStrength'

describe('PasswordStrength', () => {
  it('marks a password that misses a requirement as weak', () => {
    render(<PasswordStrength password="abc" />)

    expect(screen.getByText('Débil')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Débil')
  })

  it('marks a password that just meets the minimum as normal', () => {
    render(<PasswordStrength password="Abc12345!" />)

    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  })

  it('marks a long compliant password as strong', () => {
    render(<PasswordStrength password="Abc12345!xyzQ" />)

    expect(screen.getByText('Fuerte')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Fuerte')
  })

  it('lists every requirement as met once the password complies', () => {
    render(<PasswordStrength password="Abc12345!" />)

    expect(screen.getAllByText('cumplido')).toHaveLength(5)
    expect(screen.queryByText('pendiente')).not.toBeInTheDocument()
  })

  // El estado no puede depender sólo del color del icono.
  it('spells out which requirement is still pending', () => {
    render(<PasswordStrength password="Abcdefg1" />)

    expect(screen.getByText('Un carácter especial').parentElement).toHaveTextContent('pendiente')
    expect(screen.getAllByText('cumplido')).toHaveLength(4)
  })
})
