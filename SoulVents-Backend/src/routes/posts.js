import { Router } from 'express';
import { postOperations } from '../db/posts.js';
import { authenticateToken } from '../middleware/auth.js';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const posts = await postOperations.getAllPosts();
    res.json(posts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, tags } = req.body;
    const post = await postOperations.createPost(
      randomUUID(),
      req.user.id,
      content,
      tags
    );
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;