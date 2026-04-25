import { createAuthClient } from '@neondatabase/neon-js/auth'

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL as string | undefined

export type NeonAuthClient = {
  getJWTToken: () => Promise<string | null>
  getSession: () => Promise<{ data: { user: { id: string; email: string } } | null }>
  signIn: { social: (opts: { provider: string; callbackURL: string }) => Promise<void> }
  signOut: () => Promise<void>
}

export const authClient = NEON_AUTH_URL
  ? (createAuthClient(NEON_AUTH_URL) as unknown as NeonAuthClient)
  : null

export const IS_NEON = !!NEON_AUTH_URL
