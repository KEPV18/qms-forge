import { createClient } from "@supabase/supabase-js"

const envObj: Record<string, unknown> = (import.meta as unknown as { env?: Record<string, unknown> }).env || {}
const SUPABASE_URL_RAW = typeof envObj.VITE_SUPABASE_URL === "string" ? envObj.VITE_SUPABASE_URL : undefined
// Support both common naming conventions
const SUPABASE_KEY_RAW =
  typeof envObj.VITE_SUPABASE_ANON_KEY === "string"
    ? envObj.VITE_SUPABASE_ANON_KEY
    : typeof envObj.VITE_SUPABASE_PUBLISHABLE_KEY === "string"
      ? envObj.VITE_SUPABASE_PUBLISHABLE_KEY
      : undefined

const SUPABASE_URL = SUPABASE_URL_RAW ? String(SUPABASE_URL_RAW).replace(/`/g, "").trim() : "https://qvbqzenpxsduhhhikbcx.supabase.co"
const SUPABASE_ANON_KEY = SUPABASE_KEY_RAW ? String(SUPABASE_KEY_RAW).trim() : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnF6ZW5weHNkdWhoaGlrYmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MTU4NjUsImV4cCI6MjA4NTk5MTg2NX0.QegWahbjFcbopke8fnnUbvrZa7Lrcc6WKQVWN3vDiNw"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
