import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getOracleConfig, checkOracleHealth, deployToOracle } from '@/lib/oracle-config';

const execAsync = promisify(exec);

interface UpdateStatus {
  hasChanges: boolean;
  lastCommit: string;
  lastCommitMessage: string;
  lastCommitDate: string;
  deploymentStatus: 'idle' | 'checking' | 'updating' | 'completed' | 'failed';
  deploymentMessage: string;
  oracleInstanceStatus: 'online' | 'offline' | 'updating';
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'check-updates') {
      return await checkForUpdates();
    } else if (action === 'deploy-updates') {
      return await deployUpdates();
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Update system error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function checkForUpdates(): Promise<NextResponse> {
  try {
    // Get current branch and remote info
    const { stdout: currentBranch } = await execAsync('git branch --show-current');
    const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url');
    
    // Fetch latest changes from remote
    await execAsync('git fetch origin');
    
    // Get local and remote commit hashes
    const { stdout: localCommit } = await execAsync('git rev-parse HEAD');
    const { stdout: remoteCommit } = await execAsync(`git rev-parse origin/${currentBranch.trim()}`);
    
    // Get commit information
    const { stdout: commitInfo } = await execAsync(`git log -1 --pretty=format:"%H|%s|%ci"`);
    const [commitHash, commitMessage, commitDate] = commitInfo.trim().split('|');
    
    const hasChanges = localCommit.trim() !== remoteCommit.trim();
    
    const updateStatus: UpdateStatus = {
      hasChanges,
      lastCommit: commitHash,
      lastCommitMessage: commitMessage,
      lastCommitDate: commitDate,
      deploymentStatus: hasChanges ? 'checking' : 'idle',
      deploymentMessage: hasChanges ? 'Updates available' : 'System is up to date',
      oracleInstanceStatus: 'online'
    };

    return NextResponse.json({
      success: true,
      data: updateStatus
    });
  } catch (error) {
    console.error('Check updates error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check for updates',
      data: {
        hasChanges: false,
        lastCommit: '',
        lastCommitMessage: '',
        lastCommitDate: '',
        deploymentStatus: 'failed' as const,
        deploymentMessage: 'Failed to check for updates',
        oracleInstanceStatus: 'offline' as const
      }
    });
  }
}

async function deployUpdates(): Promise<NextResponse> {
  try {
    // Check if we're in a git repository
    const { stdout: gitStatus } = await execAsync('git status --porcelain');
    
    if (gitStatus.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Local changes detected. Please commit or stash changes before updating.',
        data: {
          deploymentStatus: 'failed' as const,
          deploymentMessage: 'Local changes detected. Please commit or stash changes before updating.'
        }
      });
    }

    // Get current branch
    const { stdout: currentBranch } = await execAsync('git branch --show-current');
    const branch = currentBranch.trim();

    // Pull latest changes
    await execAsync(`git pull origin ${branch}`);

    // Install dependencies if package.json changed
    const { stdout: packageChanges } = await execAsync('git diff --name-only HEAD~1 HEAD | grep package.json || true');
    if (packageChanges.trim()) {
      await execAsync('npm install');
    }

    // Build the application
    await execAsync('npm run build');

    // Restart the application (this depends on your deployment setup)
    await restartApplication();

    // Deploy to Oracle instance
    const oracleConfig = getOracleConfig();
    const oracleDeploymentSuccess = await deployToOracle(oracleConfig, `
      -- Oracle deployment script
      -- This script will be executed on your Oracle instance
      -- Add your specific Oracle deployment commands here
      
      -- Example: Update application version
      UPDATE system_config SET version = '${new Date().toISOString()}' WHERE config_key = 'app_version';
      
      -- Example: Log deployment
      INSERT INTO deployment_log (deployment_date, status, message) 
      VALUES (SYSDATE, 'SUCCESS', 'Application updated from GitHub');
      
      COMMIT;
    `);

    return NextResponse.json({
      success: true,
      data: {
        deploymentStatus: 'completed' as const,
        deploymentMessage: oracleDeploymentSuccess 
          ? 'System updated successfully and deployed to Oracle instance' 
          : 'System updated successfully but Oracle deployment failed',
        oracleInstanceStatus: oracleDeploymentSuccess ? 'online' as const : 'offline' as const,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Deploy updates error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to deploy updates',
      data: {
        deploymentStatus: 'failed' as const,
        deploymentMessage: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        oracleInstanceStatus: 'offline' as const
      }
    });
  }
}

async function restartApplication(): Promise<void> {
  try {
    // Check if PM2 is available
    try {
      await execAsync('pm2 --version');
      // Restart with PM2
      await execAsync('pm2 restart all');
    } catch {
      // PM2 not available, try other methods
      try {
        // Check if systemctl is available (for systemd)
        await execAsync('systemctl --version');
        await execAsync('sudo systemctl restart learnvastora');
      } catch {
        // Fallback: kill the process and let the process manager restart it
        await execAsync('pkill -f "next"');
      }
    }
  } catch (error) {
    console.error('Restart application error:', error);
    throw new Error('Failed to restart application');
  }
}

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get system status
    const { stdout: gitStatus } = await execAsync('git status --porcelain');
    const { stdout: lastCommit } = await execAsync('git log -1 --pretty=format:"%H|%s|%ci"');
    const [commitHash, commitMessage, commitDate] = lastCommit.trim().split('|');

    // Check Oracle instance status (you'll need to implement this based on your setup)
    const oracleStatus = await checkOracleInstanceStatus();

    const systemStatus = {
      gitStatus: gitStatus.trim() ? 'dirty' : 'clean',
      lastCommit: commitHash,
      lastCommitMessage: commitMessage,
      lastCommitDate: commitDate,
      oracleInstanceStatus: oracleStatus,
      lastCheck: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: systemStatus
    });
  } catch (error) {
    console.error('Get system status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get system status'
    });
  }
}

async function checkOracleInstanceStatus(): Promise<'online' | 'offline' | 'updating'> {
  try {
    const oracleConfig = getOracleConfig();
    const isHealthy = await checkOracleHealth(oracleConfig);
    return isHealthy ? 'online' : 'offline';
  } catch (error) {
    console.error('Oracle instance check error:', error);
    return 'offline';
  }
} 