import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import type { JWT } from 'next-auth/jwt';
import {
  isPublicRoute,
  isAuthRoute,
  isProtectedRoute,
  isAdminRoute,
  getRequiredRoles,
  hasRequiredRoles,
  getRedirectConfig,
  normalizePath,
  DEFAULT_LOGIN_REDIRECT,
} from '@/lib/routes';

// Enable debug mode via environment variable
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Next.js 16 Proxy with NextAuth middleware integration
 * 
 * Uses NextAuth's withAuth wrapper for better authentication handling:
 * - Automatic session validation
 * - Built-in token refresh
 * - Better error handling
 * - Role-based authorization
 * - Security headers injection
 * - Request performance tracking
 * 
 * @see https://next-auth.js.org/configuration/nextjs#middleware
 */
export default withAuth(
  async function proxy(request: NextRequest) {
    const startTime = DEBUG ? Date.now() : 0;
    const { pathname } = request.nextUrl;
    const normalizedPath = normalizePath(pathname);

    // Debug logging
    if (DEBUG) {
      console.log(`[Proxy] ${request.method} ${pathname}`);
    }
    
    // 1. Check for static redirects first (fastest check)
    const redirectConfig = getRedirectConfig(normalizedPath);
    if (redirectConfig) {
      if (DEBUG) {
        console.log(`[Proxy] Static redirect: ${normalizedPath} → ${redirectConfig.destination}`);
      }
      const url = new URL(redirectConfig.destination!, request.url);
      return NextResponse.redirect(url, {
        status: redirectConfig.permanent ? 308 : 307,
      });
    }

    // 2. Get token from request (provided by withAuth)
    const token = (request as NextRequest & { nextauth?: { token?: JWT } }).nextauth?.token;
    const isAuthenticated = !!token;
    const userRoles = (token?.roles as string[]) || [];

    if (DEBUG && isAuthenticated) {
      console.log(`[Proxy] Authenticated user: ${token?.rtrUserId}, roles: ${userRoles.join(', ')}`);
    }

    // 3. Handle public routes
    if (isPublicRoute(normalizedPath)) {
      // Redirect authenticated users away from auth pages
      if (isAuthRoute(normalizedPath) && isAuthenticated) {
        const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
        const destination = callbackUrl || DEFAULT_LOGIN_REDIRECT;
        
        if (DEBUG) {
          console.log(`[Proxy] Redirecting authenticated user from ${normalizedPath} → ${destination}`);
        }
        
        return NextResponse.redirect(new URL(destination, request.url));
      }
      
      // Allow access to public routes
      return addSecurityHeaders(NextResponse.next(), false, startTime);
    }

    // 4. Check role-based access for protected routes
    const isProtected = isProtectedRoute(normalizedPath) || isAdminRoute(normalizedPath);
    
    if (isAuthenticated && isProtected) {
      // Check admin routes first (most restrictive)
      if (isAdminRoute(normalizedPath) && !userRoles.includes('Admin')) {
        if (DEBUG) {
          console.log(`[Proxy] Admin access denied for user with roles: ${userRoles.join(', ')}`);
        }
        
        const dashboardUrl = new URL('/dashboard', request.url);
        dashboardUrl.searchParams.set('error', 'forbidden');
        dashboardUrl.searchParams.set('message', 'Admin access required');
        return NextResponse.redirect(dashboardUrl);
      }

      // Check role-based routes
      const requiredRoles = getRequiredRoles(normalizedPath);
      
      if (requiredRoles && requiredRoles.length > 0 && !hasRequiredRoles(userRoles, requiredRoles)) {
        if (DEBUG) {
          console.log(`[Proxy] Role check failed. Required: ${requiredRoles.join(', ')}, Has: ${userRoles.join(', ')}`);
        }
        
        const dashboardUrl = new URL('/dashboard', request.url);
        dashboardUrl.searchParams.set('error', 'unauthorized');
        dashboardUrl.searchParams.set('message', `Access denied. Required roles: ${requiredRoles.join(' or ')}`);
        return NextResponse.redirect(dashboardUrl);
      }
    }

    // 5. Allow access and add security headers
    return addSecurityHeaders(
      NextResponse.next(),
      isAuthenticated,
      startTime,
      token,
      userRoles
    );
  },
  {
    callbacks: {
      /**
       * Authorize callback - determines if user can access the route
       * Return true to allow, false to redirect to login
       */
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        const normalizedPath = normalizePath(pathname);

        // Always allow public routes
        if (isPublicRoute(normalizedPath)) {
          return true;
        }

        // Require authentication for protected routes
        const isProtected = isProtectedRoute(normalizedPath) || isAdminRoute(normalizedPath);
        if (isProtected) {
          return !!token; // Must have valid token
        }

        // Allow other routes
        return true;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

/**
 * Add security headers to the response
 * @param response - The Next.js response
 * @param isAuthenticated - Whether the user is authenticated
 * @param startTime - Request start time for performance tracking
 * @param token - User's JWT token (optional)
 * @param userRoles - User's roles (optional)
 * @returns Response with security headers
 */
function addSecurityHeaders(
  response: NextResponse,
  isAuthenticated: boolean,
  startTime: number,
  token?: JWT | null,
  userRoles?: string[]
): NextResponse {
  // Core security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  // Content Security Policy (strict)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline for dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ];
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  // Add user context headers for server components (when authenticated)
  if (isAuthenticated && token) {
    response.headers.set('X-User-Id', (token.rtrUserId as string) || '');
    response.headers.set('X-User-Roles', (userRoles || []).join(','));
  }
  
  // Performance tracking in development
  if (DEBUG && startTime > 0) {
    const duration = Date.now() - startTime;
    response.headers.set('X-Proxy-Time', `${duration}ms`);
    console.log(`[Proxy] Request completed in ${duration}ms`);
  }

  return response;
}

/**
 * Matcher configuration - specify which routes this middleware should run on
 * 
 * This matcher will run the middleware on:
 * - All routes except static files (_next/static)
 * - All routes except image optimization files (_next/image)
 * - All routes except favicon.ico
 * - All API routes except NextAuth endpoints
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
