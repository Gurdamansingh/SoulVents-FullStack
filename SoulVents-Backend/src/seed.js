import { db, dbOps } from './db/index.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

async function seed() {
  try {
    // Create users
    const userPassword = await bcrypt.hash('password123', 10);

    const user1Id = randomUUID();
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (?, ?, ?, ?, ?)`,
      args: [user1Id, 'john@example.com', userPassword, 'John Doe', 'USER']
    });

    const expert1Id = randomUUID();
    const expert1UserId = randomUUID();
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (?, ?, ?, ?, ?)`,
      args: [expert1UserId, 'emily@example.com', userPassword, 'Dr. Emily Williams', 'EXPERT']
    });

    await db.execute({
      sql: `INSERT INTO experts (id, user_id, type, specialty, rate, bio, languages, availability, is_online, rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        expert1Id,
        expert1UserId,
        'PROFESSIONAL',
        'Clinical Psychology',
        5.0,
        'Experienced clinical psychologist specializing in anxiety, depression, and trauma therapy.',
        JSON.stringify(['English', 'French']),
        JSON.stringify({
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true }
        }),
        1,
        4.9
      ]
    });

    // Create testimonials
    const testimonials = [
      {
        name: "Sarah M.",
        location: "Mumbai",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
        rating: 5,
        title: "Found hope when I needed it most",
        content: "I was going through a difficult time after losing my job and struggling with anxiety. The consultants here were so understanding and supportive. After just a few sessions, I felt much more hopeful and had practical strategies to manage my anxiety. I'm now back on my feet with a new job and feeling more resilient than ever.",
        tags: ["Anxiety", "Career Stress", "Consultant"],
        expertType: "CONSULTANT",
        featured: true,
        approved: true
      },
      {
        name: "James R.",
        location: "Delhi",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
        rating: 5,
        title: "Professional therapy changed my life",
        content: "After struggling with depression for years, I finally decided to seek help. The professional therapy sessions have been transformative. My therapist is highly qualified and genuinely caring. We've worked through deep-seated issues, and I've learned valuable coping mechanisms. For the first time in a decade, I feel like myself again.",
        tags: ["Depression", "Professional Therapy", "Long-term Support"],
        expertType: "PROFESSIONAL",
        featured: true,
        approved: true
      },
      {
        name: "Priya K.",
        location: "Bangalore",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
        rating: 5,
        title: "Helped me through exam stress",
        content: "As a university student, I was overwhelmed with exam stress and anxiety. The guidance I received was invaluable. My consultant helped me develop better study habits and stress management techniques. I'm now performing better academically and feeling much more balanced.",
        tags: ["Student Stress", "Anxiety", "Consultant"],
        expertType: "CONSULTANT",
        featured: false,
        approved: true
      }
    ];

    for (const testimonial of testimonials) {
      const id = randomUUID();
      await db.execute({
        sql: `INSERT INTO testimonials (
                id, user_id, name, location, image, rating, title, content, 
                tags, expert_type, featured, approved, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          user1Id, // All testimonials from the same user for demo
          testimonial.name,
          testimonial.location,
          testimonial.image,
          testimonial.rating,
          testimonial.title,
          testimonial.content,
          JSON.stringify(testimonial.tags),
          testimonial.expertType,
          testimonial.featured ? 1 : 0,
          testimonial.approved ? 1 : 0,
          new Date().toISOString()
        ]
      });
    }

    console.log('Seed data created successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();