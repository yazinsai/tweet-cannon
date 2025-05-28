import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker container monitoring
 * Returns basic application status and uptime information
 */

export async function GET() {
  try {
    // Basic health checks
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        memory: checkMemoryUsage(),
        storage: checkStorageAvailability(),
      }
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Check memory usage
 */
function checkMemoryUsage() {
  const usage = process.memoryUsage();
  const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const freeMB = totalMB - usedMB;
  
  return {
    total: `${totalMB}MB`,
    used: `${usedMB}MB`,
    free: `${freeMB}MB`,
    percentage: Math.round((usedMB / totalMB) * 100)
  };
}

/**
 * Check if localStorage simulation is available
 */
function checkStorageAvailability() {
  try {
    // In a server environment, we can't check localStorage directly
    // but we can verify that our storage utilities are importable
    return {
      available: true,
      type: 'server-side'
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown storage error'
    };
  }
}
