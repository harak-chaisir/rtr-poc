import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { withLoggingAndErrorHandling } from '@/lib/logger';
import { UnauthorizedError, BadGatewayError } from '@/lib/errors';
import { decryptAccessToken } from '@/lib/auth/token-service';
import { config } from '@/lib/config';

const FASTTRAK_BASE_URL = config.fastTrakApi;

/**
 * FastTrak API Proxy
 * 
 * This route handler proxies requests to the FastTrak API
 * and automatically adds authentication headers.
 * 
 * Usage: /api/fasttrak/[...path]
 * Example: /api/fasttrak/users -> http://localhost:3001/users
 */

async function handleProxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
    // Get user token for authentication
    const token = await getToken({
      req: request,
      secret: config.nextAuthSecret,
    });

  if (!token?.accessToken) {
    throw new UnauthorizedError('Valid authentication required');
  }

  // Build the target URL
  const path = pathSegments.join('/');
  const url = new URL(`/${path}`, FASTTRAK_BASE_URL);
  
  // Copy query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  // Prepare headers
  const headers = new Headers();
  
  // Decrypt access token for use in FastTrak API request
  try {
    const decryptedToken = decryptAccessToken(token.accessToken as string);
    headers.set('Authorization', `Bearer ${decryptedToken}`);
  } catch {
    throw new UnauthorizedError('Invalid access token');
  }
  
  headers.set('Content-Type', 'application/json');

  // Copy relevant headers from original request
  const allowedHeaders = ['accept', 'accept-language', 'content-type'];
  allowedHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  });

  // Get request body for POST/PUT/PATCH
  let body: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const requestBody = await request.json();
      body = JSON.stringify(requestBody);
    } catch {
      // No body or invalid JSON - that's ok, just continue
    }
  }

  // Make the proxied request
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body,
      cache: 'no-store',
    });
  } catch (error) {
    // Network or connection errors
    throw new BadGatewayError(
      `Failed to connect to FastTrak API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'FastTrak'
    );
  }

  // Get response data
  const responseText = await response.text();
  
  // Try to parse as JSON
  let responseData;
  try {
    // Handle comment-prefixed responses from FastTrak
    const cleanedResponse = responseText.replace(/^\/\/.*$/gm, '').trim();
    responseData = JSON.parse(cleanedResponse);
  } catch {
    responseData = responseText;
  }

  // Return proxied response with original status
  // Note: We don't throw errors for non-2xx responses from FastTrak
  // as those should be passed through to the client
  return NextResponse.json(responseData, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Export wrapped handlers
export const GET = withLoggingAndErrorHandling(async (
  request: NextRequest,
  { params }: { params: { path: string[] } }
) => {
  return handleProxyRequest(request, params.path, 'GET');
});

export const POST = withLoggingAndErrorHandling(async (
  request: NextRequest,
  { params }: { params: { path: string[] } }
) => {
  return handleProxyRequest(request, params.path, 'POST');
});

export const PUT = withLoggingAndErrorHandling(async (
  request: NextRequest,
  { params }: { params: { path: string[] } }
) => {
  return handleProxyRequest(request, params.path, 'PUT');
});

export const DELETE = withLoggingAndErrorHandling(async (
  request: NextRequest,
  { params }: { params: { path: string[] } }
) => {
  return handleProxyRequest(request, params.path, 'DELETE');
});

export const PATCH = withLoggingAndErrorHandling(async (
  request: NextRequest,
  { params }: { params: { path: string[] } }
) => {
  return handleProxyRequest(request, params.path, 'PATCH');
});
