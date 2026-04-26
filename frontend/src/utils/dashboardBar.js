const dashboardPathMatchers = {
  ADMIN: (pathname) => pathname.startsWith('/admin') || pathname === '/notifications',
  CLIENT: (pathname) =>
    pathname.startsWith('/client') ||
    pathname === '/messages' ||
    pathname === '/notifications',
  FREELANCER: (pathname) =>
    pathname.startsWith('/freelancer') || pathname === '/messages' || pathname === '/notifications',
};

export function shouldShowDashboardBar(role, pathname) {
  return Boolean(role && dashboardPathMatchers[role]?.(pathname));
}
