import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCurrentUser,
  isAuthenticationError,
} from './server-api'


function apiResponse(code: number, data: unknown = {}, message = 'Success') {
  return new Response(JSON.stringify({ code, data, message }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}


const TEST_USER = {
  uuid: 'test-user-id',
  username: 'persistent-user',
  displayName: 'Persistent User',
  role: 'user',
}


describe('silent authentication refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'csrf_refresh_token=; Max-Age=0; path=/'
  })

  it('shares one refresh request across concurrent expired requests', async () => {
    document.cookie = 'csrf_refresh_token=test-refresh-csrf; path=/'
    let accessReady = false
    let refreshCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/auth/token/refresh')) {
        refreshCalls += 1
        expect((init?.headers as Record<string, string>)['X-CSRF-TOKEN']).toBe('test-refresh-csrf')
        await Promise.resolve()
        accessReady = true
        return apiResponse(200)
      }
      if (url.endsWith('/api/user/login/info')) {
        return accessReady
          ? apiResponse(200, TEST_USER)
          : apiResponse(5003, {}, 'Missing token')
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const [first, second] = await Promise.all([getCurrentUser(), getCurrentUser()])

    expect(first.username).toBe(TEST_USER.username)
    expect(second.username).toBe(TEST_USER.username)
    expect(refreshCalls).toBe(1)
  })

  it('reports signed out only after refresh is also unavailable', async () => {
    let logoutCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/auth/logout')) {
        logoutCalls += 1
        return apiResponse(200)
      }
      if (url.endsWith('/api/user/login/info') || url.endsWith('/api/auth/token/refresh')) {
        return apiResponse(5003, {}, 'Missing token')
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const error = await getCurrentUser().catch((reason: unknown) => reason)

    expect(isAuthenticationError(error)).toBe(true)
    expect(logoutCalls).toBe(1)
  })

  it('clears a revoked legacy session before reporting signed out', async () => {
    let logoutCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/auth/logout')) {
        logoutCalls += 1
        return apiResponse(200)
      }
      if (url.endsWith('/api/user/login/info')) {
        return apiResponse(5005, {}, 'Token has been revoked')
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const error = await getCurrentUser().catch((reason: unknown) => reason)

    expect(isAuthenticationError(error)).toBe(true)
    expect(logoutCalls).toBe(1)
  })
})
