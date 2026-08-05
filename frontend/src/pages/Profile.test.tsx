import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Profile from './Profile'
import { ApiError, usersApi } from '../services/api'
import type { Profile as ProfileData, User } from '../services/api'

const USER: User = {
  id: 'user-1',
  email: 'walter@example.com',
  username: 'cinefila',
  firstName: 'Walter',
  lastName: 'Toledo',
  createdAt: '2026-08-01T10:00:00.000Z',
}

const PROFILE: ProfileData = {
  user: USER,
  stats: { watched: 3, pending: 5, reviews: 2 },
}

/** La ruta /login es un marcador para poder afirmar la sesión caducada. */
function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<p>pantalla de inicio de sesión</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Profile', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(usersApi, 'getProfile').mockResolvedValue(PROFILE)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('greets the user by their full name and shows the stats', async () => {
    renderProfile()

    expect(await screen.findByRole('heading', { name: 'Hola, Walter Toledo' })).toBeInTheDocument()
    expect(screen.getByText('@cinefila · walter@example.com')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('sends only the modified fields and confirms the update', async () => {
    const updateProfile = vi
      .spyOn(usersApi, 'updateProfile')
      .mockResolvedValue({ ...USER, firstName: 'Wally' })

    renderProfile()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Wally' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Perfil actualizado')
    expect(updateProfile).toHaveBeenCalledWith({ firstName: 'Wally' })
    expect(screen.getByRole('heading', { name: 'Hola, Wally Toledo' })).toBeInTheDocument()
  })

  it('closes the form without calling the API when nothing changed', async () => {
    const updateProfile = vi.spyOn(usersApi, 'updateProfile')

    renderProfile()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('button', { name: 'Editar perfil' })).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('translates a taken username into spanish', async () => {
    vi.spyOn(usersApi, 'updateProfile').mockRejectedValue(
      new ApiError(409, 'username already taken'),
    )

    renderProfile()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }))
    fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: 'tomada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ese nombre de usuario ya está en uso',
    )
  })
})
