const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleResources = [
  {
    title: 'Essential Grammar: Present Perfect',
    description: 'Master the present perfect tense with interactive exercises and real-world examples.',
    type: 'INTERACTIVE',
    category: 'grammar',
    difficulty: 'INTERMEDIATE',
    duration: 45,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['grammar', 'present-perfect', 'intermediate'],
    thumbnail: 'https://example.com/thumbnails/grammar-present-perfect.jpg',
    url: 'https://example.com/resources/grammar-present-perfect.pdf'
  },
  {
    title: 'Business Vocabulary Builder',
    description: 'Learn essential business terms and phrases for professional communication.',
    type: 'VIDEO',
    category: 'business',
    difficulty: 'ADVANCED',
    duration: 60,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['business', 'vocabulary', 'professional'],
    thumbnail: 'https://example.com/thumbnails/business-vocabulary.jpg',
    url: 'https://example.com/resources/business-vocabulary.mp4'
  },
  {
    title: 'Pronunciation: Vowel Sounds',
    description: 'Practice English vowel sounds with audio examples and tongue twisters.',
    type: 'AUDIO',
    category: 'pronunciation',
    difficulty: 'BEGINNER',
    duration: 30,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['pronunciation', 'vowels', 'beginner'],
    thumbnail: 'https://example.com/thumbnails/pronunciation-vowels.jpg',
    url: 'https://example.com/resources/pronunciation-vowels.mp3'
  },
  {
    title: 'Daily Conversation Practice',
    description: 'Common phrases and expressions for everyday conversations.',
    type: 'INTERACTIVE',
    category: 'conversation',
    difficulty: 'BEGINNER',
    duration: 40,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['conversation', 'phrases', 'beginner'],
    thumbnail: 'https://example.com/thumbnails/conversation-practice.jpg',
    url: 'https://example.com/resources/conversation-practice.pdf'
  },
  {
    title: 'Advanced Business Communication',
    description: 'Master professional communication skills for the workplace.',
    type: 'VIDEO',
    category: 'business',
    difficulty: 'ADVANCED',
    duration: 75,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['business', 'communication', 'professional'],
    thumbnail: 'https://example.com/thumbnails/business-communication.jpg',
    url: 'https://example.com/resources/business-communication.mp4'
  },
  {
    title: 'Cultural Etiquette Guide',
    description: 'Learn about cultural customs and social norms in different countries.',
    type: 'GUIDE',
    category: 'culture',
    difficulty: 'INTERMEDIATE',
    duration: 50,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['culture', 'etiquette', 'social'],
    thumbnail: 'https://example.com/thumbnails/cultural-etiquette.jpg',
    url: 'https://example.com/resources/cultural-etiquette.pdf'
  },
  {
    title: 'Vocabulary Expansion: Academic Words',
    description: 'Build your academic vocabulary with advanced terminology and usage.',
    type: 'INTERACTIVE',
    category: 'vocabulary',
    difficulty: 'ADVANCED',
    duration: 55,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['vocabulary', 'academic', 'advanced'],
    thumbnail: 'https://example.com/thumbnails/academic-vocabulary.jpg',
    url: 'https://example.com/resources/academic-vocabulary.pdf'
  },
  {
    title: 'Speaking Confidence Builder',
    description: 'Develop confidence in speaking through guided practice sessions.',
    type: 'AUDIO',
    category: 'pronunciation',
    difficulty: 'INTERMEDIATE',
    duration: 35,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['pronunciation', 'confidence', 'speaking'],
    thumbnail: 'https://example.com/thumbnails/speaking-confidence.jpg',
    url: 'https://example.com/resources/speaking-confidence.mp3'
  },
  {
    title: 'Travel Conversation Essentials',
    description: 'Essential phrases and vocabulary for traveling and tourism.',
    type: 'INTERACTIVE',
    category: 'conversation',
    difficulty: 'BEGINNER',
    duration: 40,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['conversation', 'travel', 'tourism'],
    thumbnail: 'https://example.com/thumbnails/travel-conversation.jpg',
    url: 'https://example.com/resources/travel-conversation.pdf'
  },
  {
    title: 'Grammar Mastery: Complex Sentences',
    description: 'Learn to construct and understand complex sentence structures.',
    type: 'VIDEO',
    category: 'grammar',
    difficulty: 'ADVANCED',
    duration: 65,
    language: 'English',
    ageGroup: 'ADULTS',
    tags: ['grammar', 'complex-sentences', 'advanced'],
    thumbnail: 'https://example.com/thumbnails/complex-sentences.jpg',
    url: 'https://example.com/resources/complex-sentences.mp4'
  }
];

async function createSampleResources() {
  try {
    console.log('Creating sample teaching resources...');

    for (const resourceData of sampleResources) {
      // Check if resource already exists
      const existingResource = await prisma.teachingResource.findFirst({
        where: { title: resourceData.title }
      });

      if (existingResource) {
        console.log(`Resource "${resourceData.title}" already exists, skipping...`);
        continue;
      }

      // Create resource
      const resource = await prisma.teachingResource.create({
        data: resourceData
      });

      console.log(`Created resource: ${resource.title}`);

      // Create some sample downloads, favorites, and ratings
      const tutors = await prisma.user.findMany({
        where: { role: 'TUTOR' },
        take: 3
      });

      for (const tutor of tutors) {
        // Create sample download
        await prisma.resourceDownload.create({
          data: {
            tutorId: tutor.id,
            resourceId: resource.id
          }
        });

        // Create sample favorite (50% chance)
        if (Math.random() > 0.5) {
          await prisma.resourceFavorite.create({
            data: {
              tutorId: tutor.id,
              resourceId: resource.id
            }
          });
        }

        // Create sample rating (70% chance)
        if (Math.random() > 0.3) {
          await prisma.resourceRating.create({
            data: {
              tutorId: tutor.id,
              resourceId: resource.id,
              rating: Math.floor(Math.random() * 2) + 4 // 4-5 stars
            }
          });
        }
      }
    }

    console.log('Sample teaching resources created successfully!');
  } catch (error) {
    console.error('Error creating sample resources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleResources(); 