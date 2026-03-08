export type ProfileRow = {
  id: string
  user_id: string
  email: string
  display_name?: string
  password?: string
  is_active?: boolean
  last_login?: string | null
  created_at?: string
  updated_at?: string
}
