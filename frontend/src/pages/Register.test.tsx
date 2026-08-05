import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Register from './Register'
import { ApiError, authApi } from '../services/api'
import type { User } from '../services/api'

const USER: User = {
  id: 'user-1',
  email: 'walter@example.com',
  username: 'cinefila',
  firstName: 'Walter',
  lastName: 'Toledo',
  createdAt: '2026-08-01T10:00:00.000Z',
}

/** La ruta / es un marcador para poder afirmar la navegación tras registrarse. */
function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<p>inicio</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillForm() {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Walter' } })
  fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Toledo' } })
  fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: 'cinefila' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'walter@example.com' } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'SuperSecret123' } })
}

describe('Register', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the profile fields next to the credentials', () => {
    renderRegister()

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
    expect(screen.getByLabelText('Apellidos')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre de usuario')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('submits every field and stores the token', async () => {
    const register = vi
      .spyOn(authApi, 'register')
      .mockResolvedValue({ user: USER, token: 'a.b.c' })

    renderRegister()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }))

    expect(await screen.findByText('inicio')).toBeInTheDocument()
    expect(register).toHaveBeenCalledWith({
      email: 'walter@example.com',
      password: 'SuperSecret123',
      firstName: 'Walter',
      lastName: 'Toledo',
      username: 'cinefila',
    })
    expect(localStorage.getItem('cinetracker.token')).toBe('a.b.c')
  })

  it('translates a taken username into spanish', async () => {
    vi.spyOn(authApi, 'register').mockRejectedValue(
      new ApiError(409, 'username already taken'),
    )

    renderRegister()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ese nombre de usuario ya está en uso',
    )
  })
})
