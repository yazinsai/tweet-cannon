/**
 * API route for validating Twitter cookies
 * POST /api/auth/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithCookies } from '@/lib/auth';
import { ERROR_MESSAGES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cookies } = body;
    
    if (!cookies) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cookies are required' 
        },
        { status: 400 }
      );
    }
    
    const result = await authenticateWithCookies(cookies);
    
    if (!result.success) {
      return NextResponse.json(
        result,
        { status: 401 }
      );
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Cookie validation API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: ERROR_MESSAGES.VALIDATION_FAILED 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
