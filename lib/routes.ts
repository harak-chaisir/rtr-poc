/**
 * Advanced Routing and Proxy Configuration for Next.js 16
 * 
 * This file defines routing rules, redirects, and proxy configurations
 * that can be used throughout the application.
 */

export interface RouteConfig {
  path: string;
  destination?: string;
  permanent?: boolean;
  requiresAuth?: boolean;
  roles?: string[];
}

/**
 * Public routes accessible without authentication
 */
export const PUBLIC_ROUTES: string[] = [
  '/',
  '/login',
  '/api/auth/signin',
  '/api/auth/callback',
  '/api/auth/signout',
  '/api/auth/csrf',
  '/api/auth/providers',
  '/api/auth/session',
];

/**
 * Authentication routes (redirect to dashboard if already authenticated)
 */
export const AUTH_ROUTES: string[] = [
  '/login',
  '/register',
];

/**
 * Protected routes requiring authentication
 */
export const PROTECTED_ROUTES: string[] = [
  '/dashboard',
  '/profile',
  '/settings',
];

/**
 * Admin-only routes (requires Admin role)
 */
export const ADMIN_ROUTES: string[] = [
  '/admin',
  '/admin/users',
  '/admin/settings',
];

/**
 * Route redirects configuration
 * These are static redirects that will be applied automatically
 */
export const ROUTE_REDIRECTS: RouteConfig[] = [
  {
    path: '/home',
    destination: '/',
    permanent: true,
  },
  {
    path: '/signin',
    destination: '/login',
    permanent: false,
  },
  {
    path: '/signout',
    destination: '/api/auth/signout',
    permanent: false,
  },
];

/**
 * Role-based route configuration
 * Maps routes to required roles
 */
export const ROLE_BASED_ROUTES: Record<string, string[]> = {
  '/dashboard': [], // Any authenticated user
  '/admin': ['Admin'],
  '/admin/users': ['Admin'],
  '/payment': ['Payment_Admin', 'Admin'],
  '/booking': ['Booker', 'Admin'],
};

/**
 * API proxy configuration for external services
 * This can be used to proxy requests to FastTrak or other services
 */
export const API_PROXY_CONFIG = {
  fasttrak: {
    source: '/api/fasttrak/:path*',
    destination: process.env.FASTTRAK_API || 'http://localhost:3001',
    rewrite: (path: string) => path.replace('/api/fasttrak', ''),
  },
};

/**
 * Default redirect after login
 */
export const DEFAULT_LOGIN_REDIRECT = '/dashboard';

/**
 * Default redirect after logout
 */
export const DEFAULT_LOGOUT_REDIRECT = '/';

/**
 * Check if a route is public
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1));
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

/**
 * Check if a route is an auth route
 */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a route is protected
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a route requires admin access
 */
export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Get required roles for a route
 */
export function getRequiredRoles(pathname: string): string[] | null {
  for (const [route, roles] of Object.entries(ROLE_BASED_ROUTES)) {
    if (pathname.startsWith(route)) {
      return roles;
    }
  }
  return null;
}

/**
 * Check if user has required roles for a route
 */
export function hasRequiredRoles(userRoles: string[], requiredRoles: string[]): boolean {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.some(role => userRoles.includes(role));
}

/**
 * Get redirect configuration for a path
 */
export function getRedirectConfig(pathname: string): RouteConfig | null {
  return ROUTE_REDIRECTS.find(redirect => redirect.path === pathname) || null;
}

/**
 * Normalize pathname (remove trailing slashes, etc.)
 */
export function normalizePath(pathname: string): string {
  // Remove trailing slash except for root
  if (pathname !== '/' && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Build callback URL with original destination
 */
export function buildCallbackUrl(pathname: string, baseUrl: string): string {
  const loginUrl = new URL('/login', baseUrl);
  if (pathname !== '/' && pathname !== '/login') {
    loginUrl.searchParams.set('callbackUrl', pathname);
  }
  return loginUrl.toString();
}
