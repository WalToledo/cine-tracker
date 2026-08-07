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

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

/** El formulario completo con valores que pasan todas las reglas del registro. */
function fillRegister() {
  type('Nombre', 'Walter')
  type('Apellidos', 'Toledo')
  type('Nombre de usuario', 'cinefila')
  type('Email', 'walter@example.com')
  typePassword('SuperSecret123!')
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

describe('AuthForm field validation', () => {
  const REGISTER_PROPS = {
    withProfileFields: true,
    withPasswordRules: true,
    withFieldRules: true,
  }

  it('says nothing about a half-typed email until the field is left', () => {
    renderForm(REGISTER_PROPS)
    type('Email', 'walter@')

    expect(screen.queryByText('Email no es válido')).not.toBeInTheDocument()

    fireEvent.blur(screen.getByLabelText('Email'))

    expect(screen.getByText('Email no es válido')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('clears the warning as soon as the field becomes valid', () => {
    renderForm(REGISTER_PROPS)
    type('Email', 'walter@')
    fireEvent.blur(screen.getByLabelText('Email'))

    type('Email', 'walter@example.com')

    expect(screen.queryByText('Email no es válido')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false')
  })

  it('does not submit an invalid form and points at the offending field', () => {
    const onSubmit = vi.fn()
    renderForm({ ...REGISTER_PROPS, onSubmit })
    fillRegister()
    // Sin blur: el aviso todavía no está pintado cuando se pulsa el botón.
    type('Nombre de usuario', 'ci-nefila')

    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nombre de usuario')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Nombre de usuario')).toHaveFocus()
  })

  it('submits once everything is valid', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ ...REGISTER_PROPS, onSubmit })
    fillRegister()

    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }))

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'walter@example.com',
      password: 'SuperSecret123!',
      firstName: 'Walter',
      lastName: 'Toledo',
      username: 'cinefila',
    })
  })

  /**
   * La garantía de las cuentas anteriores al Step 11: el login sólo exige que los
   * campos estén llenos. Si aplicara el patrón de email, una cuenta vieja cuyo
   * email no lo pasara quedaría fuera para siempre.
   */
  it('lets login through with an email the register would reject', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ title: 'Entrar', submitLabel: 'Entrar', onSubmit })
    type('Email', 'walter@localhost')
    typePassword('legacy1')

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(onSubmit).toHaveBeenCalled()
  })

  it('still blocks an empty login instead of calling the api', () => {
    const onSubmit = vi.fn()
    renderForm({ title: 'Entrar', submitLabel: 'Entrar', onSubmit })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe tu email')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveFocus()
  })
})
