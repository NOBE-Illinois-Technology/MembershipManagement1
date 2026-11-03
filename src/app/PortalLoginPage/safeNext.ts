// Where to go after signing in: the page that sent you here (?next=/users/admin), else the dashboard.
// Only same-site paths are allowed, so a crafted link can't bounce you to another website.
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/Layer3';
}
