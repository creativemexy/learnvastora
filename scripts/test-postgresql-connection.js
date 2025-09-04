#!/usr/bin/env node

const { Client } = require('pg');

const connectionString = 'postgresql://postgres:fuckyou@2025@129.146.39.42:5432/learnvastora';

async function testConnection() {
  console.log('🔌 Testing PostgreSQL connection...\n');
  
  try {
    // First, try to connect to the default postgres database
    const client = new Client({
      host: '129.146.39.42',
      port: 5432,
      user: 'postgres',
      password: 'fuckyou@2025',
      database: 'postgres' // Connect to default database first
    });

    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL server');
    
    // Check if learnvastora database exists
    const result = await client.query(`
      SELECT datname FROM pg_database WHERE datname = 'learnvastora'
    `);
    
    if (result.rows.length === 0) {
      console.log('📝 Creating learnvastora database...');
      await client.query('CREATE DATABASE learnvastora');
      console.log('✅ Database learnvastora created successfully');
    } else {
      console.log('✅ Database learnvastora already exists');
    }
    
    await client.end();
    
    // Now test connection to the learnvastora database
    const learnvastoraClient = new Client({
      host: '129.146.39.42',
      port: 5432,
      user: 'postgres',
      password: 'fuckyou@2025',
      database: 'learnvastora'
    });
    
    await learnvastoraClient.connect();
    console.log('✅ Successfully connected to learnvastora database');
    
    // Test basic query
    const testResult = await learnvastoraClient.query('SELECT version()');
    console.log('✅ Database query test successful');
    console.log(`📊 PostgreSQL version: ${testResult.rows[0].version.split(' ')[0]}`);
    
    await learnvastoraClient.end();
    
    console.log('\n🎉 PostgreSQL connection test successful!');
    console.log('\n📝 Next steps:');
    console.log('1. Copy this connection string to your .env file:');
    console.log(`   DATABASE_URL="${connectionString}"`);
    console.log('2. Run: npx prisma migrate dev --name init');
    console.log('3. Run: npx prisma db seed (if you have seed data)');
    console.log('4. Start your application');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if PostgreSQL is running on the server');
      console.log('2. Verify the IP address and port');
      console.log('3. Check firewall settings');
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Check username and password');
    } else if (error.code === '3D000') {
      console.log('\n💡 Database does not exist. Check database name');
    }
    
    process.exit(1);
  }
}

testConnection();
