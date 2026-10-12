// Keep the contributed middleware API for assemblers. Request-specific errors
// must reach reducers and callers intact; fetch() owns session-expiry handling.
export function authMiddleware() {
  return (next) => (action) => next(action);
}
