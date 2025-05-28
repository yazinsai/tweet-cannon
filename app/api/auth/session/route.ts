/**
 * API route for session management
 * GET /api/auth/session - Get current session
 * DELETE /api/auth/session - Sign out
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, signOut, refreshSession, isSessionValid } from '@/lib/auth';
import { ERROR_MESSAGES } from '@/lib/constants';

export async function GET() {
  try {
    const session = await getCurrentSession();
    
    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          error: ERROR_MESSAGES.SESSION_INVALID,
          authenticated: false
        },
        { status: 401 }
      );
    }
    
    // Check if session is still valid
    const isValid = await isSessionValid();
    
    if (!isValid) {
      // Try to refresh the session
      const refreshed = await refreshSession();
      
      if (!refreshed) {
        return NextResponse.json(
          { 
            success: false, 
            error: ERROR_MESSAGES.COOKIES_EXPIRED,
            authenticated: false
          },
          { status: 401 }
        );
      }
      
      // Get the refreshed session
      const refreshedSession = await getCurrentSession();
      
      return NextResponse.json({
        success: true,
        authenticated: true,
        data: {
          username: refreshedSession?.username,
          lastValidated: refreshedSession?.lastValidated,
          isValid: refreshedSession?.isValid
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      data: {
        username: session.username,
        lastValidated: session.lastValidated,
        isValid: session.isValid
      }
    });
    
  } catch (error) {
    console.error('Session API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: ERROR_MESSAGES.SESSION_INVALID,
        authenticated: false
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await signOut();
    
    return NextResponse.json({
      success: true,
      message: 'Signed out successfully'
    });
    
  } catch (error) {
    console.error('Sign out API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sign out' 
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
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
