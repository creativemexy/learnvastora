import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: 'Missing settings data' }, { status: 400 });
    }

    // Import settings
    const importedSettings = await prisma.globalSettings.upsert({
      where: { id: 1 },
      update: settings,
      create: {
        id: 1,
        ...settings
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Settings imported successfully',
      settings: importedSettings
    });

  } catch (error) {
    console.error('Settings import error:', error);
    return NextResponse.json(
      { error: 'Failed to import settings' },
      { status: 500 }
    );
  }
} 