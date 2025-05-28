import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function initializeDb(db) {
  try {
    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT CHECK (role IN ('USER', 'EXPERT', 'ADMIN')) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // Experts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS experts (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        image_url TEXT,
        type TEXT CHECK (type IN ('CONSULTANT', 'PROFESSIONAL')) NOT NULL,
        specialty TEXT NOT NULL,
        rate REAL NOT NULL CHECK (rate > 0),
        bio TEXT,
        is_online INTEGER DEFAULT 0,
        last_active DATETIME,
        languages TEXT DEFAULT '["English"]',
        availability TEXT,
        rating REAL DEFAULT 0,
        total_sessions INTEGER DEFAULT 0,
        qualifications TEXT DEFAULT NULL,
        license_number TEXT DEFAULT NULL,
        experience TEXT DEFAULT NULL,
        commission_rate REAL CHECK (commission_rate >= 0 AND commission_rate <= 100),
        credits INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    

    // Expert payment info table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS expert_payment_info (
        id TEXT PRIMARY KEY,
        expert_id TEXT UNIQUE REFERENCES experts(id) ON DELETE CASCADE,
        bank_name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        account_number_iv TEXT NOT NULL,
        account_number_tag TEXT NOT NULL,
        ifsc_code TEXT NOT NULL,
        ifsc_code_iv TEXT NOT NULL,
        ifsc_code_tag TEXT NOT NULL,
        account_holder_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Withdrawal requests table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id TEXT PRIMARY KEY,
        expert_id TEXT REFERENCES experts(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL CHECK (amount > 0),
        status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) NOT NULL DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        processed_by TEXT REFERENCES users(id)
      )
    `);

    // User profiles table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        credits INTEGER DEFAULT 50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        expert_id TEXT REFERENCES experts(id) ON DELETE CASCADE,
        type TEXT CHECK (type IN ('CHAT', 'CALL')) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER,
        amount REAL,
        is_connected INTEGER DEFAULT 0,
        status TEXT CHECK (status IN ('SCHEDULED', 'WAITING', 'ONGOING', 'COMPLETED', 'CANCELLED')) NOT NULL,
        rate REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reviews table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        expert_id TEXT REFERENCES experts(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Credit transactions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type TEXT CHECK (type IN ('purchase', 'usage')) NOT NULL,
        description TEXT NOT NULL,
        payment_id TEXT,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Credit transfers table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS credit_transfers (
        id TEXT PRIMARY KEY,
        expert_id TEXT REFERENCES experts(id) ON DELETE CASCADE,
        total_amount INTEGER NOT NULL,
        commission_rate REAL NOT NULL,
        commission_amount INTEGER NOT NULL,
        expert_amount INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Testimonials table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        location TEXT,
        image TEXT,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        expert_type TEXT CHECK (expert_type IN ('CONSULTANT', 'PROFESSIONAL')),
        featured INTEGER DEFAULT 0,
        approved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Blog posts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        featured_image TEXT,
        status TEXT CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')) NOT NULL DEFAULT 'DRAFT',
        categories TEXT DEFAULT '[]' NOT NULL,
        tags TEXT DEFAULT '[]' NOT NULL,
        meta_title TEXT,
        meta_description TEXT,
        read_time INTEGER,
        views INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME
      )
    `);

    // Create indexes for blog posts
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at)
    `);

    // OTP requests table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS otp_requests (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        type TEXT CHECK (type IN ('REGISTRATION', 'LOGIN')) NOT NULL,
        attempts INTEGER DEFAULT 0
      )
    `);

    // Create indexes for OTP requests
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_otp_requests_email 
      ON otp_requests(email)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_otp_requests_expires_at 
      ON otp_requests(expires_at)
    `);

    // Create default admin users if they don't exist
    // Create default admin users if they don't exist
    const admins = [
      { email: 'tamanpreet97@gmail.com', password: 'GST@123', fullName: 'SoulVents Admin' },
      { email: 'sakshambharwal@gmail.com', password: 'GST@123', fullName: 'SoulVents Admin' },
      { email: 'gurdamansingh2112@gmail.com', password: 'GST@123', fullName: 'SoulVents Admin' },
      { email: 'norgosolutions@gmail.com', password: 'GST@123', fullName: 'SoulVents Admin' }
    ];

    for (const admin of admins) {
      const adminExists = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [admin.email]
      });

      if (adminExists.rows.length === 0) {
        const adminId = randomUUID();
        const passwordHash = await bcrypt.hash(admin.password, 10);

        await db.execute({
          sql: `INSERT INTO users (id, email, password_hash, full_name, role)
                VALUES (?, ?, ?, ?, ?)`,
          args: [adminId, admin.email, passwordHash, admin.fullName, 'ADMIN']
        });

        await db.execute({
          sql: `INSERT INTO user_profiles (id, user_id, full_name, credits)
                VALUES (?, ?, ?, ?)`,
          args: [randomUUID(), adminId, admin.fullName, 1000]
        });

        console.log(`Admin user created: ${admin.email}`);
      }
    }

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}