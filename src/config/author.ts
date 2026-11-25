// Default author recorded on records and audit entries when no user is attached.
// Set VITE_DEFAULT_AUTHOR in the environment to use a real address.
export const DEFAULT_AUTHOR: string =
  (import.meta.env.VITE_DEFAULT_AUTHOR as string | undefined) || 'system@example.com';
