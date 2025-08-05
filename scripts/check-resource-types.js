const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkResourceTypes() {
  try {
    console.log('🔍 Checking Resource Types in Database...\n');

    // Get all unique resource types
    const resourceTypes = await prisma.teachingResource.groupBy({
      by: ['type'],
      _count: { type: true }
    });

    console.log('📊 Resource Types in Database:');
    resourceTypes.forEach(rt => {
      console.log(`   ${rt.type}: ${rt._count.type} resources`);
    });

    // Check the enum values from schema
    console.log('\n📋 Expected ResourceType Enum Values:');
    console.log('   LESSON_PLAN, WORKSHEET, VIDEO, PRESENTATION, QUIZ, GAME, TEMPLATE, GUIDE, AUDIO, INTERACTIVE');

    // Test the correct query
    console.log('\n🧪 Testing Correct Query...');
    
    const studentResources = await prisma.teachingResource.findMany({
      where: {
        isActive: true,
        type: { in: ['VIDEO', 'AUDIO', 'INTERACTIVE', 'QUIZ'] }
      },
      select: {
        id: true,
        title: true,
        type: true,
        category: true
      }
    });

    console.log(`✅ Found ${studentResources.length} student-appropriate resources`);
    
    if (studentResources.length > 0) {
      console.log('\n📚 Sample Student Resources:');
      studentResources.slice(0, 3).forEach((resource, index) => {
        console.log(`${index + 1}. ${resource.title} (${resource.type}) - ${resource.category}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking resource types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkResourceTypes(); 