/** Accept only the configured permanent redirect, whether absolute or root-relative. */
export function isPermanentRedirect(response, expected) {
  const target = response.headers.get('location');
  return response.status === 301 && (target === expected.href || target === expected.pathname);
}
