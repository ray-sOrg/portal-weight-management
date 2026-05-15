import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { router } from './router'

describe('router app shell', () => {
  it('renders dashboard navigation', async () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('体重管理')).toBeInTheDocument()
    expect(await screen.findByText('今天的身体趋势，一眼看清')).toBeInTheDocument()
  })
})
