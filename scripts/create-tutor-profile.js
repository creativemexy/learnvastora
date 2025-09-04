const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTutorProfile() {
  try {
    console.log('🔧 Setting up tutor profile for test tutor...');
    
    // Find the tutor user
    const tutor = await prisma.user.findUnique({
      where: { email: 'tutor@learnvastora.com' }
    });
    
    if (!tutor) {
      console.log('❌ Tutor user not found. Please run create-core-users.js first.');
      return;
    }
    
    // Create or update tutor profile
    const tutorProfile = await prisma.tutorProfile.upsert({
      where: { userId: tutor.id },
      update: {
        bio: 'Experienced tutor with expertise in multiple subjects',
        hourlyRate: 25.00,
        skills: ['Mathematics', 'English', 'Science', 'Programming'],
        subjects: ['Mathematics', 'English', 'Science', 'Programming'],
        education: 'Bachelor of Science in Education',
        experience: 5,
        languages: ['English', 'Spanish'],
        availability: { message: 'Weekdays and weekends' }
      },
      create: {
        userId: tutor.id,
        bio: 'Experienced tutor with expertise in multiple subjects',
        hourlyRate: 25.00,
        skills: ['Mathematics', 'English', 'Science', 'Programming'],
        subjects: ['Mathematics', 'English', 'Science', 'Programming'],
        education: 'Bachelor of Science in Education',
        experience: 5,
        languages: ['English', 'Spanish'],
        availability: { message: 'Weekdays and weekends' }
      }
    });
    
    console.log('✅ Tutor profile created successfully!');
    console.log(`📋 Profile ID: ${tutorProfile.id}`);
    console.log(`💰 Hourly Rate: $${tutorProfile.hourlyRate}`);
    console.log(`🎯 Skills: ${tutorProfile.skills.join(', ')}`);
    
    // Create some sample availability slots
    const availabilitySlots = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }, // Monday morning
      { dayOfWeek: 2, startTime: '14:00', endTime: '17:00' }, // Tuesday afternoon
      { dayOfWeek: 3, startTime: '10:00', endTime: '13:00' }, // Wednesday morning
      { dayOfWeek: 4, startTime: '15:00', endTime: '18:00' }, // Thursday afternoon
      { dayOfWeek: 5, startTime: '09:00', endTime: '12:00' }, // Friday morning
      { dayOfWeek: 6, startTime: '10:00', endTime: '16:00' }, // Saturday
      { dayOfWeek: 0, startTime: '10:00', endTime: '16:00' }  // Sunday
    ];
    
    console.log('\n📅 Creating availability slots...');
    
    for (const slot of availabilitySlots) {
      try {
        await prisma.availability.create({
          data: {
            userId: tutor.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: true
          }
        });
        console.log(`✅ Created slot: ${slot.startTime}-${slot.endTime} (Day ${slot.dayOfWeek})`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Slot already exists for day ${slot.dayOfWeek} at ${slot.startTime}`);
        } else {
          console.log(`❌ Error creating slot: ${error.message}`);
        }
      }
    }
    
    console.log('\n🎉 Tutor setup complete!');
    console.log('\n📝 Test tutor can now:');
    console.log(' - Login at /auth/signin with tutor@learnvastora.com / Tutor123!');
    console.log(' - Access tutor dashboard at /tutor/dashboard');
    console.log(' - View and manage bookings');
    console.log(' - Access tutor library');
    console.log(' - Set up payment methods');
    
  } catch (error) {
    console.error('❌ Error creating tutor profile:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTutorProfile();
