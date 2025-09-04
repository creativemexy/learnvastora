#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🐘 Setting up PostgreSQL for LearnVastora...\n');

// Check if PostgreSQL is installed
try {
  execSync('psql --version', { stdio: 'pipe' });
  console.log('✅ PostgreSQL is installed');
} catch (error) {
  console.log('❌ PostgreSQL is not installed. Please install it first:');
  console.log('   Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib');
  console.log('   macOS: brew install postgresql');
  console.log('   Windows: Download from https://www.postgresql.org/download/windows/');
  process.exit(1);
}

// Check if PostgreSQL service is running
try {
  execSync('pg_isready', { stdio: 'pipe' });
  console.log('✅ PostgreSQL service is running');
} catch (error) {
  console.log('❌ PostgreSQL service is not running. Starting it...');
  try {
    execSync('sudo systemctl start postgresql', { stdio: 'pipe' });
    console.log('✅ PostgreSQL service started');
  } catch (startError) {
    console.log('❌ Failed to start PostgreSQL service. Please start it manually.');
    process.exit(1);
  }
}

// Create database and user
const dbName = 'learnvastora';
const dbUser = 'learnvastora_user';
const dbPassword = 'learnvastora_pass';

console.log('\n🔧 Setting up database...');

try {
  // Create user
  execSync(`sudo -u postgres createuser --interactive --pwprompt ${dbUser}`, {
    stdio: 'pipe',
    input: 'n\nn\ny\n' // No superuser, No create databases, Yes create roles
  });
  console.log('✅ Database user created');
} catch (error) {
  console.log('⚠️  User might already exist, continuing...');
}

try {
  // Create database
  execSync(`sudo -u postgres createdb -O ${dbUser} ${dbName}`, { stdio: 'pipe' });
  console.log('✅ Database created');
} catch (error) {
  console.log('⚠️  Database might already exist, continuing...');
}

// Set password for user
try {
  execSync(`sudo -u postgres psql -c "ALTER USER ${dbUser} PASSWORD '${dbPassword}';"`, { stdio: 'pipe' });
  console.log('✅ User password set');
} catch (error) {
  console.log('⚠️  Could not set password, user might already have one');
}

// Grant privileges
try {
  execSync(`sudo -u postgres psql -d ${dbName} -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`, { stdio: 'pipe' });
  execSync(`sudo -u postgres psql -d ${dbName} -c "GRANT ALL ON SCHEMA public TO ${dbUser};"`, { stdio: 'pipe' });
  console.log('✅ Privileges granted');
} catch (error) {
  console.log('⚠️  Could not grant privileges');
}

// Create .env file
const envContent = `# Database Configuration
DATABASE_URL="postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Payment Gateway Keys
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
PAYSTACK_SECRET_KEY="sk_test_..."
FLUTTERWAVE_PUBLIC_KEY="FLWPUBK_TEST_..."
FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST_..."

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_SIGNAL_URL="http://localhost:4000"

# Oracle Configuration (if needed)
ORACLE_HOST="localhost"
ORACLE_PORT="1521"
ORACLE_SERVICE="XE"
ORACLE_USERNAME="system"
ORACLE_PASSWORD="password"
ORACLE_REST_API_URL="http://localhost:8080"
ORACLE_REST_USERNAME="admin"
ORACLE_REST_PASSWORD="admin"

# Development Oracle Configuration
DEV_ORACLE_HOST="localhost"
DEV_ORACLE_PORT="1521"
DEV_ORACLE_SERVICE="XE"
DEV_ORACLE_USERNAME="system"
DEV_ORACLE_PASSWORD="password"

# Logging Service (optional)
LOGGING_SERVICE_URL=""

# Signal Server
SIGNAL_PORT="4000"
`;

const envPath = path.join(process.cwd(), '.env');
fs.writeFileSync(envPath, envContent);

console.log('\n📋 Environment file created at .env');
console.log('\n🔑 Database credentials:');
console.log(`   Database: ${dbName}`);
console.log(`   User: ${dbUser}`);
console.log(`   Password: ${dbPassword}`);
console.log(`   Host: localhost`);
console.log(`   Port: 5432`);

console.log('\n📝 Next steps:');
console.log('1. Update the .env file with your actual API keys');
console.log('2. Run: npx prisma migrate dev --name init');
console.log('3. Run: npx prisma db seed (if you have seed data)');
console.log('4. Start your application');

console.log('\n✅ PostgreSQL setup complete!');
