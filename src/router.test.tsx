import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from './router'

vi.mock('./lib/server-api', () => ({
  addServerWeightEntry: vi.fn(),
  loadWeightAppData: vi.fn(() => Promise.reject(new Error('未登录'))),
  loginWithPassword: vi.fn(),
  logout: vi.fn(),
  readProfileHeight: vi.fn(() => 170),
  updateProfileHeight: vi.fn(),
}))

describe('router app shell', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renders login-first dashboard state', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('体重管理')).toBeInTheDocument()
    expect(await screen.findByText('先登录，再记录')).toBeInTheDocument()
  })
})
