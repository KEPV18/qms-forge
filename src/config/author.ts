// Default author recorded on records and audit entries when no user is attached.
// This is a public build-time value (VITE_ vars are bundled into the browser build).
// It labels the audit identity only. It does not identify the actual current user.
// Blank or whitespace-only values fall back to the system identity.
const configured = (import.meta.env.VITE_DEFAULT_AUTHOR as string | undefined)?.trim();

export const DEFAULT_AUTHOR: string = configured ? configured : 'system@example.com';
