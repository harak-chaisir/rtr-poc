import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const FASTTRAK_BASE_URL = process.env.FASTTRAK_API || 'http://localhost:3001';

/**
 * FastTrak API Proxy
 * 
 * This route handler proxies requests to the FastTrak API
 * and automatically adds authentication headers.
 * 
 * Usage: /api/fasttrak/[...path]
 * Example: /api/fasttrak/users -> http://localhost:3001/users
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params.path, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxyRequest(request, params.path, 'PATCH');
}

async function handleProxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Get user token for authentication
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid authentication required' },
        { status: 401 }
      );
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
    headers.set('Authorization', `Bearer ${token.accessToken}`);
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
        // No body or invalid JSON
      }
    }

    // Make the proxied request
    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
      cache: 'no-store',
    });

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

    // Return proxied response
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('FastTrak proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Proxy Error', 
        message: error instanceof Error ? error.message : 'Failed to proxy request to FastTrak API' 
      },
      { status: 500 }
    );
  }
}
