# Oracle Deployment Setup Guide

This guide explains how to set up automatic deployment to your Oracle instance when clicking the Update button in the super admin dashboard.

## 🚀 Quick Setup

### 1. Run the Setup Script

```bash
node scripts/setup-oracle-deployment.js
```

This interactive script will:
- Collect your Oracle connection details
- Create environment variables
- Generate deployment scripts
- Set up test connections

### 2. Configure Oracle Connection

Update `src/lib/oracle-config.ts` with your specific Oracle settings:

```typescript
export const oracleConfig: OracleConfig = {
  host: 'your-oracle-host.com',
  port: 1521,
  service: 'your-service-name',
  username: 'your-username',
  password: 'your-password',
  // ... other settings
};
```

### 3. Test Connection

```bash
chmod +x test-oracle-connection.sh
./test-oracle-connection.sh
```

### 4. Create System Tables

```bash
sqlplus username/password@host:port/service @oracle-system-tables.sql
```

## 🔧 Configuration Options

### Deployment Methods

#### 1. SQLPlus (Command Line)
- **Best for**: Direct database access
- **Requirements**: Oracle SQLPlus client installed
- **Setup**: Configure connection string in oracle-config.ts

#### 2. REST API (Oracle REST Data Services)
- **Best for**: Web-based deployments
- **Requirements**: Oracle REST Data Services configured
- **Setup**: Configure REST API URL and credentials

#### 3. Custom Script
- **Best for**: Complex deployment scenarios
- **Requirements**: Custom deployment script
- **Setup**: Point to your custom script path

### Environment Variables

Add these to your `.env` file:

```env
# Oracle Database Configuration
ORACLE_HOST=your-oracle-host.com
ORACLE_PORT=1521
ORACLE_SERVICE=your-service-name
ORACLE_USERNAME=your-username
ORACLE_PASSWORD=your-password

# Oracle REST API Configuration (optional)
ORACLE_REST_API_URL=https://host.com/ords/schema/
ORACLE_REST_USERNAME=your-rest-username
ORACLE_REST_PASSWORD=your-rest-password

# Custom Deployment Script (optional)
ORACLE_CUSTOM_SCRIPT=/path/to/your/script.sql

# Deployment Method
ORACLE_DEPLOYMENT_METHOD=sqlplus
```

## 📋 How It Works

### 1. Check for Updates
When you click "Check Updates" in the super admin dashboard:
- Fetches latest changes from GitHub
- Compares local and remote commit hashes
- Shows update status and available changes

### 2. Deploy Updates
When you click "Deploy Updates":
- Pulls latest code from GitHub
- Installs dependencies if needed
- Builds the application
- Restarts the application server
- **Deploys changes to Oracle instance**
- Updates deployment logs

### 3. Oracle Deployment Process
The system will:
1. Connect to your Oracle instance
2. Execute deployment script (`oracle-deployment.sql`)
3. Update system configuration
4. Log deployment details
5. Verify deployment success

## 🛠️ Customization

### Custom Deployment Script

Edit `oracle-deployment.sql` to include your specific Oracle operations:

```sql
-- Example: Update application version
UPDATE system_config SET config_value = '1.2.0' WHERE config_key = 'app_version';

-- Example: Update configuration
UPDATE app_config SET value = 'new_value' WHERE config_key = 'some_setting';

-- Example: Create backup
CREATE TABLE backup_20241201 AS SELECT * FROM your_table;

-- Example: Log deployment
INSERT INTO deployment_log (deployment_date, status, message) 
VALUES (SYSDATE, 'SUCCESS', 'Application updated from GitHub');

COMMIT;
```

### Health Check Customization

Modify the health check query in `oracle-config.ts`:

```typescript
healthCheckQuery: 'SELECT 1 FROM DUAL', // Default
// or
healthCheckQuery: 'SELECT COUNT(*) FROM system_config', // Custom
```

## 🔍 Monitoring

### Deployment Logs

Check deployment history in Oracle:

```sql
SELECT * FROM deployment_log ORDER BY deployment_date DESC;
```

### System Configuration

View current system settings:

```sql
SELECT * FROM system_config;
```

### Health Status

Monitor Oracle instance status:

```sql
SELECT config_key, config_value, updated_date 
FROM system_config 
WHERE config_key IN ('app_version', 'last_deployment');
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Connection Failed
- Verify Oracle host, port, and service name
- Check username and password
- Ensure Oracle client is installed
- Test with: `sqlplus username/password@host:port/service`

#### 2. Permission Denied
- Ensure Oracle user has necessary privileges
- Grant required permissions:
```sql
GRANT CREATE SESSION, CREATE TABLE, INSERT, UPDATE, SELECT 
TO your_username;
```

#### 3. Deployment Script Errors
- Check SQL syntax in `oracle-deployment.sql`
- Verify table names and structure
- Test script manually before deployment

#### 4. Application Restart Failed
- Check if PM2 is installed: `npm install -g pm2`
- Verify systemctl service name
- Check application logs

### Debug Mode

Enable debug logging by setting environment variable:

```env
DEBUG_ORACLE_DEPLOYMENT=true
```

### Manual Testing

Test each component separately:

1. **Git Check**: `git fetch && git status`
2. **Oracle Connection**: `./test-oracle-connection.sh`
3. **Deployment Script**: `sqlplus username/password@host:port/service @oracle-deployment.sql`
4. **Application Restart**: `pm2 restart all` or `sudo systemctl restart learnvastora`

## 📊 Dashboard Integration

The super admin dashboard will show:

- **Update Status**: Available updates from GitHub
- **Deployment Status**: Current deployment progress
- **Oracle Status**: Connection and health status
- **Last Update**: Timestamp of last deployment
- **Deployment Logs**: Recent deployment history

## 🔐 Security Considerations

### Environment Variables
- Store sensitive data in environment variables
- Never commit passwords to version control
- Use different credentials for development/production

### Oracle Security
- Use dedicated Oracle user for deployments
- Limit user privileges to necessary operations
- Enable Oracle auditing for deployment operations

### Network Security
- Use VPN or secure connection to Oracle instance
- Configure firewall rules appropriately
- Use SSL/TLS for REST API connections

## 📈 Advanced Features

### Automated Backups
Add to your deployment script:

```sql
-- Create backup before deployment
CREATE TABLE backup_$(date +%Y%m%d) AS SELECT * FROM your_table;
```

### Rollback Capability
Implement rollback functionality:

```sql
-- Rollback to previous version
UPDATE system_config SET config_value = '1.1.0' WHERE config_key = 'app_version';
```

### Multi-Environment Support
Configure different settings for dev/staging/prod:

```typescript
const env = process.env.NODE_ENV || 'development';
const config = getOracleConfig(env);
```

## 🎯 Best Practices

1. **Test First**: Always test deployment scripts in development
2. **Backup**: Create backups before major deployments
3. **Monitor**: Check logs after each deployment
4. **Document**: Keep deployment scripts well-documented
5. **Version**: Track deployment versions in Oracle
6. **Rollback**: Have rollback procedures ready

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Oracle and application logs
3. Test components individually
4. Verify network connectivity
5. Check Oracle user permissions

For additional help, refer to:
- Oracle Database documentation
- Next.js deployment guides
- PM2 process manager documentation 