import { PrismaClient, ResourceType, Difficulty, AgeGroup } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding teaching resources...');

  // Create teaching resources
  const resources = [
    {
      title: 'Beginner English Grammar Lesson Plan',
      description: 'Complete lesson plan for teaching basic English grammar to beginners. Includes activities, worksheets, and assessment tools.',
      type: ResourceType.LESSON_PLAN,
      category: 'grammar',
      difficulty: Difficulty.BEGINNER,
      duration: 60,
      thumbnail: '/images/resources/grammar-lesson.jpg',
      url: '/resources/grammar-lesson-plan.pdf',
      language: 'english',
      ageGroup: AgeGroup.ADULTS,
      tags: ['grammar', 'beginner', 'lesson plan', 'worksheets'],
      isActive: true
    },
    {
      title: 'Spanish Conversation Practice Worksheet',
      description: 'Interactive worksheet for practicing Spanish conversation skills. Includes role-play scenarios and vocabulary exercises.',
      type: ResourceType.WORKSHEET,
      category: 'conversation',
      difficulty: Difficulty.INTERMEDIATE,
      duration: 45,
      thumbnail: '/images/resources/spanish-conversation.jpg',
      url: '/resources/spanish-conversation-worksheet.pdf',
      language: 'spanish',
      ageGroup: AgeGroup.TEENS,
      tags: ['conversation', 'spanish', 'intermediate', 'role-play'],
      isActive: true
    },
    {
      title: 'French Pronunciation Video Guide',
      description: 'Comprehensive video guide for French pronunciation. Covers all major sounds and common pronunciation mistakes.',
      type: ResourceType.VIDEO,
      category: 'pronunciation',
      difficulty: Difficulty.BEGINNER,
      duration: 30,
      thumbnail: '/images/resources/french-pronunciation.jpg',
      url: '/resources/french-pronunciation-video.mp4',
      language: 'french',
      ageGroup: AgeGroup.ALL,
      tags: ['pronunciation', 'french', 'video', 'beginner'],
      isActive: true
    },
    {
      title: 'Business English Presentation Template',
      description: 'Professional presentation template for business English lessons. Includes slides for meetings, negotiations, and presentations.',
      type: ResourceType.PRESENTATION,
      category: 'business',
      difficulty: Difficulty.ADVANCED,
      duration: 90,
      thumbnail: '/images/resources/business-presentation.jpg',
      url: '/resources/business-english-template.pptx',
      language: 'english',
      ageGroup: AgeGroup.ADULTS,
      tags: ['business', 'presentation', 'advanced', 'professional'],
      isActive: true
    },
    {
      title: 'German Vocabulary Quiz Game',
      description: 'Interactive quiz game for learning German vocabulary. Includes multiple choice questions and scoring system.',
      type: ResourceType.QUIZ,
      category: 'vocabulary',
      difficulty: Difficulty.INTERMEDIATE,
      duration: 40,
      thumbnail: '/images/resources/german-vocabulary.jpg',
      url: '/resources/german-vocabulary-quiz.html',
      language: 'german',
      ageGroup: AgeGroup.TEENS,
      tags: ['vocabulary', 'german', 'quiz', 'interactive'],
      isActive: true
    },
    {
      title: 'Chinese Character Writing Guide',
      description: 'Step-by-step guide for teaching Chinese character writing. Includes stroke order and practice sheets.',
      type: ResourceType.GUIDE,
      category: 'writing',
      difficulty: Difficulty.BEGINNER,
      duration: 75,
      thumbnail: '/images/resources/chinese-writing.jpg',
      url: '/resources/chinese-writing-guide.pdf',
      language: 'chinese',
      ageGroup: AgeGroup.ALL,
      tags: ['writing', 'chinese', 'characters', 'beginner'],
      isActive: true
    },
    {
      title: 'Japanese Listening Comprehension Audio',
      description: 'Audio files for Japanese listening comprehension practice. Includes various difficulty levels and topics.',
      type: ResourceType.AUDIO,
      category: 'listening',
      difficulty: Difficulty.INTERMEDIATE,
      duration: 50,
      thumbnail: '/images/resources/japanese-listening.jpg',
      url: '/resources/japanese-listening-audio.zip',
      language: 'japanese',
      ageGroup: AgeGroup.ADULTS,
      tags: ['listening', 'japanese', 'audio', 'comprehension'],
      isActive: true
    },
    {
      title: 'Kids English Learning Games',
      description: 'Collection of fun educational games for teaching English to children. Includes memory games, word searches, and puzzles.',
      type: ResourceType.GAME,
      category: 'games',
      difficulty: Difficulty.BEGINNER,
      duration: 35,
      thumbnail: '/images/resources/kids-games.jpg',
      url: '/resources/kids-english-games.pdf',
      language: 'english',
      ageGroup: AgeGroup.KIDS,
      tags: ['games', 'kids', 'fun', 'beginner'],
      isActive: true
    },
    {
      title: 'Advanced English Essay Writing Template',
      description: 'Template and guidelines for teaching advanced English essay writing. Includes structure, examples, and assessment criteria.',
      type: ResourceType.TEMPLATE,
      category: 'writing',
      difficulty: Difficulty.ADVANCED,
      duration: 120,
      thumbnail: '/images/resources/essay-writing.jpg',
      url: '/resources/advanced-essay-template.docx',
      language: 'english',
      ageGroup: AgeGroup.ADULTS,
      tags: ['writing', 'essay', 'advanced', 'academic'],
      isActive: true
    },
    {
      title: 'Spanish Grammar Reference Guide',
      description: 'Comprehensive reference guide for Spanish grammar rules. Perfect for intermediate to advanced learners.',
      type: ResourceType.GUIDE,
      category: 'grammar',
      difficulty: Difficulty.ADVANCED,
      duration: 0,
      thumbnail: '/images/resources/spanish-grammar.jpg',
      url: '/resources/spanish-grammar-guide.pdf',
      language: 'spanish',
      ageGroup: AgeGroup.ADULTS,
      tags: ['grammar', 'spanish', 'reference', 'advanced'],
      isActive: true
    },
    {
      title: 'Italian Culture and Language Lesson',
      description: 'Cultural lesson combining Italian language learning with cultural insights. Includes traditions, food, and customs.',
      type: ResourceType.LESSON_PLAN,
      category: 'culture',
      difficulty: Difficulty.INTERMEDIATE,
      duration: 80,
      thumbnail: '/images/resources/italian-culture.jpg',
      url: '/resources/italian-culture-lesson.pdf',
      language: 'italian',
      ageGroup: AgeGroup.TEENS,
      tags: ['culture', 'italian', 'intermediate', 'cultural'],
      isActive: true
    },
    {
      title: 'English Speaking Practice Activities',
      description: 'Collection of speaking activities for English conversation practice. Includes discussion topics and role-play scenarios.',
      type: ResourceType.INTERACTIVE,
      category: 'speaking',
      difficulty: Difficulty.INTERMEDIATE,
      duration: 55,
      thumbnail: '/images/resources/english-speaking.jpg',
      url: '/resources/english-speaking-activities.pdf',
      language: 'english',
      ageGroup: AgeGroup.ADULTS,
      tags: ['speaking', 'english', 'conversation', 'intermediate'],
      isActive: true
    }
  ];

  for (const resource of resources) {
    // Check if resource already exists
    const existingResource = await prisma.teachingResource.findFirst({
      where: { title: resource.title }
    });

    if (existingResource) {
      await prisma.teachingResource.update({
        where: { id: existingResource.id },
        data: resource
      });
    } else {
      await prisma.teachingResource.create({
        data: resource
      });
    }
  }

  console.log('✅ Teaching resources seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 