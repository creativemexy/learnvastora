#!/usr/bin/env node

/**
 * Oracle Deployment Setup Script
 * This script helps configure Oracle instance deployment settings
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupOracleDeployment() {
  console.log('🚀 Oracle Deployment Setup');
  console.log('========================\n');

  try {
    // Get Oracle connection details
    console.log('📋 Oracle Database Configuration');
    const host = await question('Oracle Host (e.g., your-oracle-host.com): ');
    const port = await question('Oracle Port (default: 1521): ') || '1521';
    const service = await question('Oracle Service Name: ');
    const username = await question('Oracle Username: ');
    const password = await question('Oracle Password: ');

    // Get deployment method
    console.log('\n🔧 Deployment Method');
    console.log('1. SQLPlus (command line)');
    console.log('2. REST API (Oracle REST Data Services)');
    console.log('3. Custom script');
    
    const deploymentMethod = await question('Choose deployment method (1-3): ');
    
    let restApiUrl, restApiUsername, restApiPassword, customScript;
    
    if (deploymentMethod === '2') {
      console.log('\n🌐 REST API Configuration');
      restApiUrl = await question('REST API URL (e.g., https://host.com/ords/schema/): ');
      restApiUsername = await question('REST API Username: ');
      restApiPassword = await question('REST API Password: ');
    } else if (deploymentMethod === '3') {
      console.log('\n📜 Custom Script Configuration');
      customScript = await question('Path to custom deployment script: ');
    }

    // Create environment variables
    const envContent = `# Oracle Database Configuration
ORACLE_HOST=${host}
ORACLE_PORT=${port}
ORACLE_SERVICE=${service}
ORACLE_USERNAME=${username}
ORACLE_PASSWORD=${password}

# Oracle REST API Configuration (if using REST API)
${restApiUrl ? `ORACLE_REST_API_URL=${restApiUrl}` : ''}
${restApiUsername ? `ORACLE_REST_USERNAME=${restApiUsername}` : ''}
${restApiPassword ? `ORACLE_REST_PASSWORD=${restApiPassword}` : ''}

# Custom Deployment Script (if using custom script)
${customScript ? `ORACLE_CUSTOM_SCRIPT=${customScript}` : ''}

# Deployment Method
ORACLE_DEPLOYMENT_METHOD=${deploymentMethod === '1' ? 'sqlplus' : deploymentMethod === '2' ? 'rest-api' : 'custom'}
`;

    // Write to .env file
    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('\n✅ Environment variables saved to .env file');

    // Create Oracle deployment script template
    const deploymentScript = `-- Oracle Deployment Script Template
-- This script will be executed on your Oracle instance during deployment
-- Customize this script according to your Oracle setup

-- Example: Update application version
UPDATE system_config SET version = '${new Date().toISOString()}' WHERE config_key = 'app_version';

-- Example: Log deployment
INSERT INTO deployment_log (deployment_date, status, message) 
VALUES (SYSDATE, 'SUCCESS', 'Application updated from GitHub');

-- Example: Update configuration
-- UPDATE app_config SET value = 'new_value' WHERE config_key = 'some_setting';

-- Example: Create backup
-- CREATE TABLE backup_${Date.now()} AS SELECT * FROM your_table;

COMMIT;
`;

    const scriptPath = path.join(process.cwd(), 'oracle-deployment.sql');
    fs.writeFileSync(scriptPath, deploymentScript, 'utf8');
    console.log('✅ Oracle deployment script template created: oracle-deployment.sql');

    // Create system tables if they don't exist
    const systemTablesScript = `-- System Tables for Oracle Deployment
-- Run this script once to create necessary tables

-- Configuration table
CREATE TABLE system_config (
    config_key VARCHAR2(100) PRIMARY KEY,
    config_value VARCHAR2(4000),
    updated_date DATE DEFAULT SYSDATE
);

-- Deployment log table
CREATE TABLE deployment_log (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deployment_date DATE DEFAULT SYSDATE,
    status VARCHAR2(20),
    message VARCHAR2(4000),
    details CLOB
);

-- Insert default configuration
INSERT INTO system_config (config_key, config_value) VALUES ('app_version', '1.0.0');
INSERT INTO system_config (config_key, config_value) VALUES ('last_deployment', SYSDATE);

COMMIT;
`;

    const systemTablesPath = path.join(process.cwd(), 'oracle-system-tables.sql');
    fs.writeFileSync(systemTablesPath, systemTablesScript, 'utf8');
    console.log('✅ System tables script created: oracle-system-tables.sql');

    // Create test connection script
    const testScript = `#!/bin/bash
# Test Oracle Connection Script

echo "Testing Oracle connection..."

# Test basic connection
sqlplus -s ${username}/${password}@${host}:${port}/${service} <<< "SELECT 1 FROM DUAL;"

if [ $? -eq 0 ]; then
    echo "✅ Oracle connection successful"
else
    echo "❌ Oracle connection failed"
    exit 1
fi

# Test system tables
sqlplus -s ${username}/${password}@${host}:${port}/${service} <<< "SELECT config_key, config_value FROM system_config;"

if [ $? -eq 0 ]; then
    echo "✅ System tables accessible"
else
    echo "⚠️  System tables not found. Run oracle-system-tables.sql first"
fi
`;

    const testScriptPath = path.join(process.cwd(), 'test-oracle-connection.sh');
    fs.writeFileSync(testScriptPath, testScript, 'utf8');
    fs.chmodSync(testScriptPath, '755');
    console.log('✅ Test connection script created: test-oracle-connection.sh');

    console.log('\n🎉 Oracle deployment setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Update oracle-config.ts with your specific settings');
    console.log('2. Run: chmod +x test-oracle-connection.sh');
    console.log('3. Test connection: ./test-oracle-connection.sh');
    console.log('4. Create system tables: sqlplus username/password@host:port/service @oracle-system-tables.sql');
    console.log('5. Customize oracle-deployment.sql for your specific needs');
    console.log('6. Test the update functionality in the super admin dashboard');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    rl.close();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupOracleDeployment();
}

module.exports = { setupOracleDeployment }; 