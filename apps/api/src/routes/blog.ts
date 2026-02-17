import { Router, Request, Response } from 'express';
import { createPostSchema, updatePostSchema, postQuerySchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

/**
 * GET /posts
 * List published posts with filters (category, tag, search, pagination)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = postQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { category, tag, search, status, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {};

    // Public requests only see published posts; admin/editor can filter by status
    if (status) {
      where.status = status;
    } else {
      where.status = 'PUBLISHED';
    }

    if (category) {
      where.category = category;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * GET /posts/:slug
 * Get post by slug
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json({ data: post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

/**
 * POST /posts
 * Create post (editor/admin)
 */
router.post(
  '/',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const parsed = createPostSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      // Check slug uniqueness
      const existingSlug = await prisma.blogPost.findUnique({
        where: { slug: parsed.data.slug },
      });

      if (existingSlug) {
        res.status(409).json({ error: 'This post slug is already taken' });
        return;
      }

      const post = await prisma.blogPost.create({
        data: {
          ...parsed.data,
          authorId: req.user!.id,
          tags: parsed.data.tags || [],
          publishedAt: parsed.data.status === 'PUBLISHED' ? new Date() : undefined,
          scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
        },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      res.status(201).json({ data: post });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  }
);

/**
 * PUT /posts/:id
 * Update post (author/editor/admin)
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updatePostSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const post = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Author, editor, or admin can update
    const isAuthor = post.authorId === req.user!.id;
    const isEditorOrAdmin = ['EDITOR', 'ADMIN'].includes(req.user!.role);

    if (!isAuthor && !isEditorOrAdmin) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // If slug is being changed, check uniqueness
    if (parsed.data.slug && parsed.data.slug !== post.slug) {
      const existingSlug = await prisma.blogPost.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (existingSlug) {
        res.status(409).json({ error: 'This post slug is already taken' });
        return;
      }
    }

    // Set publishedAt when transitioning to PUBLISHED
    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === 'PUBLISHED' && post.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }
    if (parsed.data.scheduledAt) {
      updateData.scheduledAt = new Date(parsed.data.scheduledAt);
    }

    const updated = await prisma.blogPost.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

/**
 * DELETE /posts/:id
 * Delete post (admin only)
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const post = await prisma.blogPost.findUnique({
        where: { id: req.params.id },
      });

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      await prisma.blogPost.delete({
        where: { id: req.params.id },
      });

      res.json({ data: { message: 'Post deleted' } });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  }
);

export default router;
