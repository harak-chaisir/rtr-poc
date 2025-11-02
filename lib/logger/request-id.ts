import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing purposes
 */

export const REQUEST_ID_HEADER = 'X-Request-ID';
const REQUEST_ID_CONTEXT_KEY = 'requestId';

// Store request ID in AsyncLocalStorage for context propagation
// Note: Next.js doesn't have native AsyncLocalStorage support in all contexts,
// so we'll use headers for now. For full context propagation, consider using
// a library like cls-hooked or the experimental AsyncLocalStorage API.

/**
 * Generates a unique request ID
 * Uses nanoid for short, URL-safe IDs
 */
export function generateRequestId(): string {
  return nanoid(21); // Default length, URL-safe
}

/**
 * Gets the request ID from the request headers or generates a new one
 * 
 * @param request - The incoming request
 * @returns Request ID string
 */
export function getOrCreateRequestId(request: NextRequest): string {
  // Check if request ID already exists in headers (from proxy/load balancer)
  const existingRequestId = request.headers.get(REQUEST_ID_HEADER);
  
  if (existingRequestId) {
    return existingRequestId;
  }
  
  // Generate new request ID
  return generateRequestId();
}

/**
 * Adds request ID to response headers
 * 
 * @param response - The response object
 * @param requestId - The request ID to add
 * @returns Response with request ID header
 */
export function addRequestIdToResponse(
  response: NextResponse,
  requestId: string
): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

/**
 * Gets request ID from response headers
 * 
 * @param response - The response object
 * @returns Request ID or undefined
 */
export function getRequestIdFromResponse(response: NextResponse): string | null {
  return response.headers.get(REQUEST_ID_HEADER);
}

/**
 * Middleware helper to add request ID to both request and response
 * 
 * @param request - The incoming request
 * @param response - The response object
 * @returns Request ID that was added
 */
export function attachRequestId(
  request: NextRequest,
  response: NextResponse
): string {
  const requestId = getOrCreateRequestId(request);
  addRequestIdToResponse(response, requestId);
  
  // Also add to request headers for downstream use
  request.headers.set(REQUEST_ID_HEADER, requestId);
  
  return requestId;
}

