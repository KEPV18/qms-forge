import { createClient } from "@supabase/supabase-js"

const envObj: Record<string, unknown> = (import.meta as unknown as { env?: Record<string, unknown> }).env || {}

const SUPABASE_URL = typeof envObj.VITE_SUPABASE_URL === "string" 
  ? envObj.VITE_SUPABASE_URL.trim() 
  : undefined

const SUPABASE_ANON_KEY =
  typeof envObj.VITE_SUPABASE_ANON_KEY === "string"
    ? envObj.VITE_SUPABASE_ANON_KEY.trim()
    : typeof envObj.VITE_SUPABASE_PUBLISHABLE_KEY === "string"
      ? envObj.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
      : undefined

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables."
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
