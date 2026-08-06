import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AuthForm from './AuthForm'

function renderForm(props: Partial<Parameters<typeof AuthForm>[0]> = {}) {
  return render(
    <AuthForm
      title="Crear cuenta"
      submitLabel="Registrarme"
      onSubmit={vi.fn()}
      footer={null}
      {...props}
    />,
  )
}

function typePassword(value: string) {
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value } })
}

describe('AuthForm password rules', () => {
  it('hides the strength bar until something is typed', () => {
    renderForm({ withProfileFields: true, withPasswordRules: true })

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

    typePassword('a')

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  /**
   * Se afirma `toBeDisabled` en vez de clicar: `fireEvent.click` sobre un botón
   * deshabilitado no hace nada y el test moriría por timeout en un `findBy*`.
   */
  it('blocks the submit while the password does not comply', () => {
    renderForm({ withProfileFields: true, withPasswordRules: true })
    typePassword('SuperSecret123')

    expect(screen.getByRole('button', { name: 'Registrarme' })).toBeDisabled()
  })

  it('enables the submit once every requirement is met', () => {
    renderForm({ withProfileFields: true, withPasswordRules: true })
    typePassword('SuperSecret123!')

    expect(screen.getByRole('button', { name: 'Registrarme' })).toBeEnabled()
  })

  it('reveals and hides the password without submitting the form', () => {
    const onSubmit = vi.fn()
    renderForm({ withProfileFields: true, withPasswordRules: true, onSubmit })
    typePassword('SuperSecret123!')

    const input = screen.getByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input).toHaveAttribute('type', 'password')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  /**
   * La garantía de que nadie "unifica" las dos props: el login usa el mismo
   * componente y las cuentas anteriores al Step 11 tienen contraseñas que ya no
   * pasarían el registro.
   */
  it('leaves login alone: no bar and no blocking', () => {
    renderForm({ title: 'Entrar', submitLabel: 'Entrar' })
    typePassword('legacy1')

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })
})
