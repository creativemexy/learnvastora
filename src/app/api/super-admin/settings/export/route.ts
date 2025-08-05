import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Get current settings
    const settings = await prisma.globalSettings.findFirst();

    if (!settings) {
      return NextResponse.json({ error: 'No settings found' }, { status: 404 });
    }

    // Create export data
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: settings
    };

    return NextResponse.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('Settings export error:', error);
    return NextResponse.json(
      { error: 'Failed to export settings' },
      { status: 500 }
    );
  }
} 