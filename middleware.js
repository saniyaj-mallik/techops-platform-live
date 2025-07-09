import { NextResponse } from 'next/server';
import { getCorsHeaders } from './lib/cors-config.js';

export function middleware(request) {
  // Handle CORS for all API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Continue to the API route
    const response = NextResponse.next();
    
    // Add CORS headers to all API responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }

  // For non-API routes, continue without modification
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 