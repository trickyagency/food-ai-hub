// This hook is intentionally disabled to prevent unwanted automatic logouts.
// Inactivity timeout can cause confusion when users are logged out unexpectedly.
// If needed in the future, this can be made a user preference in settings.

export const useInactivityTimeout = (_timeoutMinutes: number = 30) => {
  // No-op - disabled to prevent unwanted logouts
};
