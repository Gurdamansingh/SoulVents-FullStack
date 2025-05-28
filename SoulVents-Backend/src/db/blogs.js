import { randomUUID } from 'crypto';

export const blogOperations = {
  getAllPublishedPosts: async () => {
    try {
      const result = await db.execute(`
        SELECT * FROM blog_posts 
        WHERE status = 'PUBLISHED' 
        ORDER BY published_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error getting published blog posts:', error);
      throw error;
    }
  },

  getAllBlogPosts: async (page = 1, limit = 10, status = null) => {
    try {
      const offset = (page - 1) * limit;
      
      let sql = `
        SELECT b.*, u.full_name as author_name
        FROM blog_posts b
        JOIN users u ON b.author_id = u.id
      `;
      
      const args = [];
      
      if (status) {
        sql += ' WHERE b.status = ?';
        args.push(status);
      }
      
      sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
      args.push(limit, offset);

      const result = await db.execute({
        sql,
        args
      });

      // Get total count for pagination
      let countSql = 'SELECT COUNT(*) as total FROM blog_posts';
      if (status) {
        countSql += ' WHERE status = ?';
      }
      
      const countResult = await db.execute({
        sql: countSql,
        args: status ? [status] : []
      });

      const total = countResult.rows[0].total;
      const totalPages = Math.ceil(total / limit);

      return {
        posts: result.rows.map(post => ({
          ...post,
          categories: JSON.parse(post.categories || '[]'),
          tags: JSON.parse(post.tags || '[]')
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error getting all blog posts:', error);
      throw error;
    }
  },

  getFeaturedBlogPosts: async (limit = 3) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM blog_posts 
              WHERE status = 'PUBLISHED' 
              ORDER BY views DESC, published_at DESC 
              LIMIT ?`,
        args: [limit]
      });
      return result.rows;
    } catch (error) {
      console.error('Error getting featured blog posts:', error);
      throw error;
    }
  },

  getAllCategories: async () => {
    try {
      const result = await db.execute(`
        SELECT DISTINCT jsonb_array_elements_text(categories::jsonb) as category,
        COUNT(*) as count
        FROM blog_posts
        WHERE status = 'PUBLISHED'
        GROUP BY category
        ORDER BY count DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  },

  getAllTags: async () => {
    try {
      const result = await db.execute(`
        SELECT DISTINCT jsonb_array_elements_text(tags::jsonb) as tag,
        COUNT(*) as count
        FROM blog_posts
        WHERE status = 'PUBLISHED'
        GROUP BY tag
        ORDER BY count DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error getting tags:', error);
      throw error;
    }
  },

  createBlogPost: async (
    authorId,
    title,
    slug,
    excerpt,
    content,
    featuredImage,
    status = 'DRAFT',
    categories = [],
    tags = [],
    metaTitle = null,
    metaDescription = null,
    readTime = null
  ) => {
    try {
      const id = randomUUID();
      const now = new Date().toISOString();
      const publishedAt = status === 'PUBLISHED' ? now : null;

      await db.execute({
        sql: `INSERT INTO blog_posts (
                id,
                author_id,
                title,
                slug,
                excerpt,
                content,
                featured_image,
                status,
                categories,
                tags,
                meta_title,
                meta_description,
                read_time,
                created_at,
                updated_at,
                published_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          authorId,
          title,
          slug,
          excerpt,
          content,
          featuredImage,
          status,
          JSON.stringify(categories),
          JSON.stringify(tags),
          metaTitle,
          metaDescription,
          readTime,
          now,
          now,
          publishedAt
        ]
      });

      return {
        id,
        authorId,
        title,
        slug,
        excerpt,
        content,
        featuredImage,
        status,
        categories,
        tags,
        metaTitle,
        metaDescription,
        readTime,
        createdAt: now,
        updatedAt: now,
        publishedAt
      };
    } catch (error) {
      console.error('Error creating blog post:', error);
      throw error;
    }
  },

  updateBlogPost: async (
    id,
    title,
    slug,
    excerpt,
    content,
    featuredImage,
    status,
    categories = [],
    tags = [],
    metaTitle = null,
    metaDescription = null,
    readTime = null
  ) => {
    try {
      const now = new Date().toISOString();
      
      // Get current post to check if we need to update published_at
      const currentPost = await db.execute({
        sql: 'SELECT status, published_at FROM blog_posts WHERE id = ?',
        args: [id]
      });
      
      if (!currentPost.rows.length) {
        throw new Error('Blog post not found');
      }
      
      // Set published_at if status is changing to PUBLISHED
      let publishedAt = currentPost.rows[0].published_at;
      if (status === 'PUBLISHED' && currentPost.rows[0].status !== 'PUBLISHED') {
        publishedAt = now;
      }

      await db.execute({
        sql: `UPDATE blog_posts SET
                title = ?,
                slug = ?,
                excerpt = ?,
                content = ?,
                featured_image = ?,
                status = ?,
                categories = ?,
                tags = ?,
                meta_title = ?,
                meta_description = ?,
                read_time = ?,
                updated_at = ?,
                published_at = ?
              WHERE id = ?`,
        args: [
          title,
          slug,
          excerpt,
          content,
          featuredImage,
          status,
          JSON.stringify(categories),
          JSON.stringify(tags),
          metaTitle,
          metaDescription,
          readTime,
          now,
          publishedAt,
          id
        ]
      });

      return {
        id,
        title,
        slug,
        excerpt,
        content,
        featuredImage,
        status,
        categories,
        tags,
        metaTitle,
        metaDescription,
        readTime,
        updatedAt: now,
        publishedAt
      };
    } catch (error) {
      console.error('Error updating blog post:', error);
      throw error;
    }
  },

  deleteBlogPost: async (id) => {
    try {
      await db.execute({
        sql: 'DELETE FROM blog_posts WHERE id = ?',
        args: [id]
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting blog post:', error);
      throw error;
    }
  },

  getBlogPostById: async (id) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT b.*, u.full_name as author_name
          FROM blog_posts b
          JOIN users u ON b.author_id = u.id
          WHERE b.id = ?
        `,
        args: [id]
      });

      if (!result.rows.length) {
        return null;
      }

      const post = result.rows[0];
      return {
        ...post,
        categories: JSON.parse(post.categories || '[]'),
        tags: JSON.parse(post.tags || '[]')
      };
    } catch (error) {
      console.error('Error getting blog post by ID:', error);
      throw error;
    }
  },

  getBlogPostBySlug: async (slug) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT b.*, u.full_name as author_name
          FROM blog_posts b
          JOIN users u ON b.author_id = u.id
          WHERE b.slug = ?
        `,
        args: [slug]
      });

      if (!result.rows.length) {
        return null;
      }

      const post = result.rows[0];
      
      // Increment view count
      await db.execute({
        sql: 'UPDATE blog_posts SET views = views + 1 WHERE id = ?',
        args: [post.id]
      });

      return {
        ...post,
        categories: JSON.parse(post.categories || '[]'),
        tags: JSON.parse(post.tags || '[]'),
        views: post.views + 1
      };
    } catch (error) {
      console.error('Error getting blog post by slug:', error);
      throw error;
    }
  }
};

// This is needed for the db variable to be accessible in this module
let db;
export const setDb = (database) => {
  db = database;
};