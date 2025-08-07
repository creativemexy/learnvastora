#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentUpdater {
  constructor() {
    this.projectRoot = process.cwd();
    this.logFile = path.join(this.projectRoot, 'deployment-update.log');
    this.backupDir = path.join(this.projectRoot, 'backups');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }

  async executeCommand(command, description) {
    try {
      this.log(`🔄 ${description}...`);
      const result = execSync(command, { 
        cwd: this.projectRoot, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      this.log(`✅ ${description} completed successfully`);
      return result;
    } catch (error) {
      this.log(`❌ ${description} failed: ${error.message}`);
      throw error;
    }
  }

  async checkGitStatus() {
    try {
      this.log('📊 Checking current git status...');
      
      // Get current branch
      const currentBranch = execSync('git branch --show-current', { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      }).trim();
      
      // Get current commit
      const currentCommit = execSync('git rev-parse HEAD', { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      }).trim().substring(0, 8);
      
      // Get remote URL
      const remoteUrl = execSync('git remote get-url origin', { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      }).trim();
      
      this.log(`📍 Current branch: ${currentBranch}`);
      this.log(`🔗 Current commit: ${currentCommit}`);
      this.log(`🌐 Remote URL: ${remoteUrl}`);
      
      return { currentBranch, currentCommit, remoteUrl };
    } catch (error) {
      this.log(`❌ Failed to check git status: ${error.message}`);
      throw error;
    }
  }

  async checkForUpdates() {
    try {
      this.log('🔍 Checking for updates on GitHub...');
      
      // Fetch latest changes from remote
      await this.executeCommand('git fetch origin', 'Fetching latest changes from remote');
      
      // Get current commit
      const currentCommit = execSync('git rev-parse HEAD', { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      }).trim();
      
      // Get latest commit from remote
      const latestCommit = execSync('git rev-parse origin/main', { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      }).trim();
      
      if (currentCommit === latestCommit) {
        this.log('✅ No updates available - already on latest version');
        return { hasUpdates: false, currentCommit, latestCommit };
      } else {
        this.log(`🆕 Updates available! Current: ${currentCommit.substring(0, 8)}, Latest: ${latestCommit.substring(0, 8)}`);
        return { hasUpdates: true, currentCommit, latestCommit };
      }
    } catch (error) {
      this.log(`❌ Failed to check for updates: ${error.message}`);
      throw error;
    }
  }

  async createBackup() {
    try {
      this.log('💾 Creating backup before update...');
      
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
      
      // Create backup of current state
      execSync(`cp -r ${this.projectRoot} ${backupPath}`, { stdio: 'pipe' });
      
      this.log(`✅ Backup created at: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.log(`❌ Failed to create backup: ${error.message}`);
      throw error;
    }
  }

  async performUpdate() {
    try {
      this.log('🚀 Starting deployment update...');
      
      // 1. Create backup
      const backupPath = await this.createBackup();
      
      // 2. Stash any local changes
      try {
        await this.executeCommand('git stash', 'Stashing local changes');
      } catch (error) {
        this.log('ℹ️ No local changes to stash');
      }
      
      // 3. Pull latest changes
      await this.executeCommand('git pull origin main', 'Pulling latest changes from GitHub');
      
      // 4. Install dependencies
      await this.executeCommand('npm install', 'Installing dependencies');
      
      // 5. Generate Prisma client
      await this.executeCommand('npx prisma generate', 'Generating Prisma client');
      
      // 6. Run database migrations
      try {
        await this.executeCommand('npx prisma db push', 'Pushing database schema changes');
      } catch (error) {
        this.log('⚠️ Database push failed, continuing with build...');
      }
      
      // 7. Build the application
      await this.executeCommand('npm run build', 'Building application');
      
      // 8. Restart services
      await this.executeCommand('pm2 restart all', 'Restarting PM2 processes');
      await this.executeCommand('sudo systemctl reload caddy', 'Reloading Caddy server');
      
      this.log('🎉 Deployment update completed successfully!');
      
      return {
        success: true,
        backupPath,
        message: 'Deployment updated successfully'
      };
      
    } catch (error) {
      this.log(`❌ Deployment update failed: ${error.message}`);
      
      // Try to restore from backup
      try {
        this.log('🔄 Attempting to restore from backup...');
        // Add restore logic here if needed
      } catch (restoreError) {
        this.log(`❌ Failed to restore from backup: ${restoreError.message}`);
      }
      
      throw error;
    }
  }

  async runUpdate() {
    try {
      this.log('🚀 Starting deployment update process...');
      
      // Check current status
      await this.checkGitStatus();
      
      // Check for updates
      const updateInfo = await this.checkForUpdates();
      
      if (!updateInfo.hasUpdates) {
        return {
          success: true,
          hasUpdates: false,
          message: 'No updates available - already on latest version'
        };
      }
      
      // Perform update
      const updateResult = await this.performUpdate();
      
      return {
        success: true,
        hasUpdates: true,
        ...updateResult
      };
      
    } catch (error) {
      this.log(`❌ Update process failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// If running directly
if (require.main === module) {
  const updater = new DeploymentUpdater();
  updater.runUpdate()
    .then(result => {
      console.log('📋 Update Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Update failed:', error);
      process.exit(1);
    });
}

module.exports = DeploymentUpdater;
