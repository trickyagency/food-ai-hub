// This hook is intentionally disabled.
// Supabase client handles automatic token refresh internally.
// Having multiple refresh attempts causes rate limiting (429 errors).

export const useAutoSessionExtend = () => {
  // No-op - Supabase handles this automatically
};
