// Oracle Instance Configuration
// Update these settings according to your Oracle setup

export interface OracleConfig {
  // Database connection settings
  host: string;
  port: number;
  service: string;
  username: string;
  password: string;
  
  // REST API settings (if using Oracle REST Data Services)
  restApiUrl?: string;
  restApiUsername?: string;
  restApiPassword?: string;
  
  // Health check settings
  healthCheckQuery: string;
  healthCheckTimeout: number;
  
  // Deployment settings
  deploymentMethod: 'sqlplus' | 'rest-api' | 'custom';
  customDeploymentScript?: string;
  
  // Monitoring settings
  enableMonitoring: boolean;
  monitoringInterval: number;
}

// Default configuration - UPDATE THESE VALUES
export const oracleConfig: OracleConfig = {
  // Database connection
  host: 'your-oracle-host.com',
  port: 1521,
  service: 'your-service-name',
  username: 'your-username',
  password: 'your-password',
  
  // REST API (optional)
  restApiUrl: 'https://your-oracle-host.com/ords/your-schema/',
  restApiUsername: 'your-rest-username',
  restApiPassword: 'your-rest-password',
  
  // Health check
  healthCheckQuery: 'SELECT 1 FROM DUAL',
  healthCheckTimeout: 5000,
  
  // Deployment method
  deploymentMethod: 'sqlplus', // or 'rest-api' or 'custom'
  customDeploymentScript: '/path/to/your/deployment/script.sql',
  
  // Monitoring
  enableMonitoring: true,
  monitoringInterval: 30000, // 30 seconds
};

// Environment-specific configurations
export const getOracleConfig = (): OracleConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...oracleConfig,
        host: process.env.ORACLE_HOST || oracleConfig.host,
        port: parseInt(process.env.ORACLE_PORT || oracleConfig.port.toString()),
        service: process.env.ORACLE_SERVICE || oracleConfig.service,
        username: process.env.ORACLE_USERNAME || oracleConfig.username,
        password: process.env.ORACLE_PASSWORD || oracleConfig.password,
        restApiUrl: process.env.ORACLE_REST_API_URL || oracleConfig.restApiUrl,
        restApiUsername: process.env.ORACLE_REST_USERNAME || oracleConfig.restApiUsername,
        restApiPassword: process.env.ORACLE_REST_PASSWORD || oracleConfig.restApiPassword,
      };
    
    case 'development':
      return {
        ...oracleConfig,
        host: process.env.DEV_ORACLE_HOST || 'localhost',
        port: parseInt(process.env.DEV_ORACLE_PORT || '1521'),
        service: process.env.DEV_ORACLE_SERVICE || 'XE',
        username: process.env.DEV_ORACLE_USERNAME || 'system',
        password: process.env.DEV_ORACLE_PASSWORD || 'password',
      };
    
    default:
      return oracleConfig;
  }
};

// Oracle connection string builder
export const buildOracleConnectionString = (config: OracleConfig): string => {
  return `${config.username}/${config.password}@${config.host}:${config.port}/${config.service}`;
};

// Oracle REST API URL builder
export const buildOracleRestUrl = (config: OracleConfig, endpoint: string): string => {
  if (!config.restApiUrl) {
    throw new Error('Oracle REST API URL not configured');
  }
  return `${config.restApiUrl}${endpoint}`;
};

// Health check functions
export const checkOracleHealth = async (config: OracleConfig): Promise<boolean> => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const connectionString = buildOracleConnectionString(config);
    const query = config.healthCheckQuery;
    
    const command = `sqlplus -s ${connectionString} <<< "${query}"`;
    const { stdout } = await execAsync(command, { timeout: config.healthCheckTimeout });
    
    return stdout.includes('1') || stdout.includes('SUCCESS');
  } catch (error) {
    console.error('Oracle health check failed:', error);
    return false;
  }
};

// Deployment functions
export const deployToOracle = async (config: OracleConfig, sqlScript: string): Promise<boolean> => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    switch (config.deploymentMethod) {
      case 'sqlplus':
        const connectionString = buildOracleConnectionString(config);
        const command = `sqlplus -s ${connectionString} <<< "${sqlScript}"`;
        await execAsync(command);
        return true;
      
      case 'rest-api':
        if (!config.restApiUrl) {
          throw new Error('REST API URL not configured');
        }
        // Implement REST API deployment
        // This would typically involve making HTTP requests to Oracle REST Data Services
        return true;
      
      case 'custom':
        if (!config.customDeploymentScript) {
          throw new Error('Custom deployment script not configured');
        }
        await execAsync(config.customDeploymentScript);
        return true;
      
      default:
        throw new Error(`Unknown deployment method: ${config.deploymentMethod}`);
    }
  } catch (error) {
    console.error('Oracle deployment failed:', error);
    return false;
  }
}; 