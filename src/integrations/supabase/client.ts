import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim())

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in .env.local"
  )
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    // Increase lock acquisition timeout to 15s (default is 5s).
    // React dev mode + slow connections can cause the auth lock to
    // appear orphaned when it's just slow to release.
    lockTimeoutMs: 15000,
  },
})