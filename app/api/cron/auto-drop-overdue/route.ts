import { NextRequest, NextResponse } from 'next/server';
import { autoDropOverdueTasksInternal } from '@/actions/actions';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute timeout

/**
 * API endpoint for auto-dropping overdue tasks
 * This can be called by cron jobs or external schedulers
 */
export async function POST(request: NextRequest) {
  try {
    // Simple authentication check (optional)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.log('Unauthorized cron request');
      // Still allow for development/testing
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('🕐 Starting scheduled auto-drop overdue tasks...');
    
    // Call the internal action function (no auth required)
    const result = await autoDropOverdueTasksInternal('cron-job');
    
    console.log('✅ Cron job completed:', result);
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Auto-drop overdue tasks cron endpoint is running',
    timestamp: new Date().toISOString()
  });
}
