import { Router, Request, Response } from 'express';
import { createConversationSchema, sendMessageSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /messages/conversations — list user's conversations
router.get('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId: req.user!.id } } },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Add unread count
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find((p) => p.userId === req.user!.id);
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: req.user!.id },
            createdAt: participant?.lastReadAt ? { gt: participant.lastReadAt } : undefined,
          },
        });
        return { ...conv, unreadCount };
      }),
    );

    res.json({ data: enriched });
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /messages/conversations/:id — get single conversation with messages
router.get('/conversations/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, participants: { some: { userId: req.user!.id } } },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });
    if (!conversation) { res.status(404).json({ error: 'Conversation not found' }); return; }

    // Mark as read
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: req.params.id, userId: req.user!.id },
      data: { lastReadAt: new Date() },
    });

    res.json({ data: conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// POST /messages/conversations — start a new conversation
router.post('/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createConversationSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const { recipientId, subject, orderId, productId, body } = parsed.data;

    if (recipientId === req.user!.id) {
      res.status(400).json({ error: 'Cannot message yourself' }); return;
    }

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) { res.status(404).json({ error: 'Recipient not found' }); return; }

    const conversation = await prisma.conversation.create({
      data: {
        subject,
        orderId,
        productId,
        participants: {
          create: [
            { userId: req.user!.id, lastReadAt: new Date() },
            { userId: recipientId },
          ],
        },
        messages: {
          create: { senderId: req.user!.id, recipientId, body },
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        messages: { include: { sender: { select: { id: true, name: true, avatarUrl: true } } } },
      },
    });

    res.status(201).json({ data: conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// POST /messages/conversations/:id/messages — send a message
router.post('/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: req.params.id, userId: req.user!.id },
    });
    if (!participant) { res.status(403).json({ error: 'Not a participant' }); return; }

    const message = await prisma.message.create({
      data: { conversationId: req.params.id, senderId: req.user!.id, body: parsed.data.body },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    });

    // Update conversation timestamp and mark as read for sender
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { lastMessageAt: new Date() },
    });
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: req.params.id, userId: req.user!.id },
      data: { lastReadAt: new Date() },
    });

    res.status(201).json({ data: message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /messages/unread-count — get total unread count
router.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
  try {
    const participantRecords = await prisma.conversationParticipant.findMany({
      where: { userId: req.user!.id },
      select: { conversationId: true, lastReadAt: true },
    });

    let totalUnread = 0;
    for (const p of participantRecords) {
      const count = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: req.user!.id },
          createdAt: p.lastReadAt ? { gt: p.lastReadAt } : undefined,
        },
      });
      totalUnread += count;
    }

    res.json({ data: { unreadCount: totalUnread } });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
