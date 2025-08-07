import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Import the deployment updater
    const DeploymentUpdater = require('../../../../../scripts/update-deployment.js');
    const updater = new DeploymentUpdater();

    // Run the update process
    const result = await updater.runUpdate();

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update system error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update system',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Import the deployment updater
    const DeploymentUpdater = require('../../../../../scripts/update-deployment.js');
    const updater = new DeploymentUpdater();

    // Check for updates without performing them
    const gitStatus = await updater.checkGitStatus();
    const updateInfo = await updater.checkForUpdates();

    return NextResponse.json({
      success: true,
      gitStatus,
      updateInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Check updates error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check for updates',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 