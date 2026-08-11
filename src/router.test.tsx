import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from './router'
import { loadWeightAppData } from './lib/server-api'

vi.mock('./lib/server-api', () => ({
  addServerWeightEntry: vi.fn(),
  createServerTrackedPerson: vi.fn(),
  loadWeightAppData: vi.fn(() => Promise.reject(new Error('未登录'))),
  isAuthenticationError: vi.fn(
    (error: unknown) => error instanceof Error && error.message === '未登录',
  ),
  loginWithPassword: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
}))

describe('router app shell', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    vi.mocked(loadWeightAppData).mockRejectedValue(new Error('未登录'))
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

  it('keeps the settings login form hidden while authentication is loading', async () => {
    vi.mocked(loadWeightAppData).mockImplementation(() => new Promise(() => undefined))
    await router.navigate({ to: '/settings' })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('正在确认登录状态')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('用户名')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('密码')).not.toBeInTheDocument()
  })

  it('shows the settings login form after authentication is confirmed missing', async () => {
    await router.navigate({ to: '/settings' })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    expect(await screen.findByPlaceholderText('用户名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument()
  })
})
