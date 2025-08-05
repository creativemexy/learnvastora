const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAndCreateUsers() {
  console.log('🔍 Checking for users in database...\n');
  
  try {
    // Check existing users
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true
      }
    });
    
    console.log(`📊 Found ${existingUsers.length} existing users:`);
    existingUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role} - ${user.active ? 'Active' : 'Inactive'}`);
    });
    
    if (existingUsers.length === 0) {
      console.log('\n⚠️  No users found! Creating sample users...\n');
      
      // Create sample users
      const sampleUsers = [
        {
          name: 'Super Admin',
          email: 'admin@learnvastora.com',
          password: 'admin123',
          role: 'SUPER_ADMIN',
          active: true
        },
        {
          name: 'John Tutor',
          email: 'tutor@learnvastora.com',
          password: 'tutor123',
          role: 'TUTOR',
          active: true
        },
        {
          name: 'Sarah Student',
          email: 'student@learnvastora.com',
          password: 'student123',
          role: 'STUDENT',
          active: true
        },
        {
          name: 'Mike Admin',
          email: 'mike@learnvastora.com',
          password: 'admin123',
          role: 'ADMIN',
          active: true
        },
        {
          name: 'Emma Tutor',
          email: 'emma@learnvastora.com',
          password: 'tutor123',
          role: 'TUTOR',
          active: false
        }
      ];
      
      for (const userData of sampleUsers) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        const user = await prisma.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            active: userData.active
          }
        });
        
        console.log(`✅ Created user: ${user.name} (${user.email}) - ${user.role}`);
      }
      
      console.log('\n🎉 Sample users created successfully!');
      console.log('\n📋 Login Credentials:');
      console.log('   Super Admin: admin@learnvastora.com / admin123');
      console.log('   Tutor: tutor@learnvastora.com / tutor123');
      console.log('   Student: student@learnvastora.com / student123');
      console.log('   Admin: mike@learnvastora.com / admin123');
      console.log('   Inactive Tutor: emma@learnvastora.com / tutor123');
      
    } else {
      console.log('\n✅ Users already exist in database');
      
      // Check if super admin exists
      const superAdmin = existingUsers.find(user => user.role === 'SUPER_ADMIN');
      if (!superAdmin) {
        console.log('\n⚠️  No Super Admin found! Creating one...');
        
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const admin = await prisma.user.create({
          data: {
            name: 'Super Admin',
            email: 'admin@learnvastora.com',
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            active: true
          }
        });
        
        console.log(`✅ Created Super Admin: ${admin.name} (${admin.email})`);
        console.log('📋 Login: admin@learnvastora.com / admin123');
      } else {
        console.log(`✅ Super Admin exists: ${superAdmin.name} (${superAdmin.email})`);
      }
    }
    
    // Final count
    const finalCount = await prisma.user.count();
    console.log(`\n📊 Total users in database: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateUsers(); 