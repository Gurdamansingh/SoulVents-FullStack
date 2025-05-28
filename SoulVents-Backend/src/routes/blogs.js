import { Router } from "express"
import { blogOperations } from "../db/blogs.js"
import { authenticateToken, isAdmin } from "../middleware/auth.js"
import { db } from "../db/index.js"

const router = Router()

// Public routes

// Get all published blog posts with pagination
router.get("/", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const result = await blogOperations.getAllBlogPosts(page, limit, "PUBLISHED")
    res.json(result)
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    res.status(500).json({ error: "Failed to fetch blog posts" })
  }
})

// Get featured blog posts
router.get("/featured", async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit) || 3
    const posts = await blogOperations.getFeaturedBlogPosts(limit)
    res.json(posts)
  } catch (error) {
    console.error("Error fetching featured blog posts:", error)
    res.status(500).json({ error: "Failed to fetch featured blog posts" })
  }
})

// Get all categories
router.get("/categories", async (_req, res) => {
  try {
    const result = await db.execute(`
      SELECT DISTINCT json_extract(categories, '$[*]') as category,
      COUNT(*) as count
      FROM blog_posts
      WHERE status = 'PUBLISHED'
      GROUP BY category
      ORDER BY count DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error("Error getting categories:", error)
    res.status(500).json({ error: "Failed to fetch categories" })
  }
})

// Get all tags
router.get("/tags", async (_req, res) => {
  try {
    const result = await db.execute(`
      SELECT DISTINCT json_extract(tags, '$[*]') as tag,
      COUNT(*) as count
      FROM blog_posts
      WHERE status = 'PUBLISHED'
      GROUP BY tag
      ORDER BY count DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error("Error getting tags:", error)
    res.status(500).json({ error: "Failed to fetch tags" })
  }
})

// Admin routes

// Get all blog posts (including drafts) for admin
router.get("/admin", authenticateToken, isAdmin, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const status = req.query.status || null // Filter by status if provided

    const result = await blogOperations.getAllBlogPosts(page, limit, status)
    res.json(result)
  } catch (error) {
    console.error("Error fetching all blog posts:", error)
    res.status(500).json({ error: "Failed to fetch blog posts" })
  }
})

// Get a single blog post by ID (admin)
router.get("/admin/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const post = await blogOperations.getBlogPostById(req.params.id)
    if (!post) {
      return res.status(404).json({ error: "Blog post not found" })
    }
    res.json(post)
  } catch (error) {
    console.error("Error fetching blog post:", error)
    res.status(500).json({ error: "Failed to fetch blog post" })
  }
})

// Create a new blog post
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, excerpt, content, featuredImage, status, categories, tags, metaTitle, metaDescription, readTime } =
      req.body

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" })
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // Create blog post
    const post = await blogOperations.createBlogPost(
      req.user.id,
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
    )

    res.status(201).json(post)
  } catch (error) {
    console.error("Error creating blog post:", error)
    res.status(500).json({ error: "Failed to create blog post" })
  }
})

// Update a blog post
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
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
    } = req.body

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" })
    }

    // Check if post exists
    const existingPost = await blogOperations.getBlogPostById(req.params.id)
    if (!existingPost) {
      return res.status(404).json({ error: "Blog post not found" })
    }

    // Generate new slug if title changed and slug not provided
    let finalSlug = slug
    if (!slug && title !== existingPost.title) {
      finalSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    } else if (!slug) {
      finalSlug = existingPost.slug
    }

    // Update blog post
    const post = await blogOperations.updateBlogPost(
      req.params.id,
      title,
      finalSlug,
      excerpt,
      content,
      featuredImage,
      status,
      categories,
      tags,
      metaTitle,
      metaDescription,
      readTime,
    )

    res.json(post)
  } catch (error) {
    console.error("Error updating blog post:", error)
    res.status(500).json({ error: "Failed to update blog post" })
  }
})

export default router
