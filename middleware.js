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
        headers: {
          ...corsHeaders,
          // Add cache headers to reduce preflight requests
          'Cache-Control': 'public, max-age=3600',
          'Vary': 'Origin'
        }
      });
    }

    // Continue to the API route with increased timeout
    const response = NextResponse.next({
      request: {
        headers: new Headers({
          ...request.headers,
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60'  // 60 second timeout
        })
      }
    });
    
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
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 