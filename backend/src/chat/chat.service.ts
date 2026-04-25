import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ========== GET ROOMS FOR USER ==========
  async getRoomsForUser(userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        participants: { where: { userId }, select: { lastReadAt: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result: any[] = [];
    for (const room of rooms) {
      const lastRead = room.participants[0]?.lastReadAt || new Date(0);
      const unreadCount = await this.prisma.chatMessage.count({
        where: {
          roomId: room.id,
          createdAt: { gt: lastRead },
          senderId: { not: userId },
        },
      });

      result.push({
        id: room.id,
        name: room.name,
        type: room.type,
        department: room.department,
        participantCount: room._count.participants,
        lastMessage: room.messages[0] || null,
        unreadCount,
      });
    }

    return result;
  }

  // ========== GET CONTACTS ==========
  async getContacts(userId: string) {
    const users = await this.prisma.user.findMany({
      where: { id: { not: userId }, isActive: true },
      select: { id: true, fullName: true, username: true, department: true, jobTitle: true },
      orderBy: { fullName: 'asc' },
    });
    return users;
  }

  // ========== CREATE ROOM (ADMIN ONLY) – default type to 'GROUP' ==========
  async createRoom(data: { name: string; type?: string; department?: string; createdBy: string }) {
    const room = await this.prisma.chatRoom.create({
      data: {
        name: data.name,
        type: data.type || 'GROUP',
        department: data.department || null,
        createdBy: data.createdBy,
      },
    });
    // Otomatis tambahkan pembuat room sebagai participant pertama
    await this.prisma.chatParticipant.create({
      data: {
        roomId: room.id,
        userId: data.createdBy,
      },
    });
    return room;
  }

  // ========== UPDATE ROOM (ADMIN ONLY) – only overwrite provided fields ==========
  async updateRoom(roomId: string, data: { name?: string; type?: string; department?: string }) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    return this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.department !== undefined && { department: data.department }),
      },
    });
  }

  // ========== DELETE ROOM (ADMIN ONLY) ==========
  async deleteRoom(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    // Cascade delete akan menghapus participant, message
    return this.prisma.chatRoom.delete({ where: { id: roomId } });
  }

  // ========== ADD PARTICIPANT TO ROOM (ADMIN ONLY) ==========
  async addParticipant(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    // Cegah penambahan participant ke personal room
    if (room.type === 'PERSONAL') throw new BadRequestException('Cannot add participants to a personal room');
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.chatParticipant.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId },
      update: {},
    });
  }

  // ========== REMOVE PARTICIPANT FROM ROOM (ADMIN ONLY) ==========
  async removeParticipant(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.type === 'PERSONAL') throw new BadRequestException('Cannot remove participants from a personal room');

    // Cek jumlah participant, jangan izinkan hapus jika tinggal satu
    const participantCount = await this.prisma.chatParticipant.count({ where: { roomId } });
    if (participantCount <= 1) throw new BadRequestException('Cannot remove the last participant. Delete the room instead.');

    const participant = await this.prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant) throw new NotFoundException('Participant not found');
    return this.prisma.chatParticipant.delete({
      where: { roomId_userId: { roomId, userId } },
    });
  }

  // ========== GET ROOM PARTICIPANTS ==========
  async getRoomParticipants(roomId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: { user: { select: { id: true, fullName: true, username: true, department: true, jobTitle: true } } },
        },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room.participants.map(p => p.user);
  }

  // ========== CREATE PERSONAL ROOM ==========
  async createPersonalRoom(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new BadRequestException('Cannot chat with yourself');

    // Ambil nama user untuk penamaan room
    const [user, targetUser] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } }),
      this.prisma.user.findUnique({ where: { id: targetUserId }, select: { fullName: true } }),
    ]);

    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        type: 'PERSONAL',
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
    });
    if (existing) return existing;

    const roomName = `${user?.fullName || userId} & ${targetUser?.fullName || targetUserId}`;

    const room = await this.prisma.chatRoom.create({
      data: {
        name: roomName,
        type: 'PERSONAL',
        createdBy: userId,
      },
    });

    await this.prisma.chatParticipant.createMany({
      data: [
        { roomId: room.id, userId },
        { roomId: room.id, userId: targetUserId },
      ],
    });

    return room;
  }

  // ========== GET MESSAGES ==========
  async getMessages(roomId: string, opts: { before?: Date; limit: number }) {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(opts.before && { createdAt: { lt: opts.before } }),
      },
      include: { sender: { select: { id: true, fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
    });
    return messages.reverse();
  }

  // ========== SEND MESSAGE ==========
  async sendMessage(roomId: string, senderId: string, data: { content?: string; fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string }) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { participants: { where: { userId: senderId } } },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.participants.length === 0) throw new BadRequestException('Not a participant');

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        content: data.content || null,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
      },
    });

    await this.prisma.chatParticipant.update({
      where: { roomId_userId: { roomId, userId: senderId } },
      data: { lastReadAt: new Date() },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // ========== EDIT MESSAGE ==========
async editMessage(messageId: string, userId: string, content: string) {
  const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new NotFoundException('Message not found');
  if (message.senderId !== userId) throw new ForbiddenException('You can only edit your own messages');

  return this.prisma.chatMessage.update({
    where: { id: messageId },
    data: { content, updatedAt: new Date() },
    include: {
      sender: { select: { id: true, fullName: true, username: true } }
    }
  });
}
  // ========== DELETE MESSAGE ==========
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('You can only delete your own messages');

    return this.prisma.chatMessage.delete({ where: { id: messageId } });
  }

  // ========== UNREAD COUNT ==========
  async getUnreadCount(userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: { participants: { where: { userId } } },
    });

    let totalUnread = 0;
    for (const room of rooms) {
      const lastRead = room.participants[0]?.lastReadAt || new Date(0);
      const count = await this.prisma.chatMessage.count({
        where: {
          roomId: room.id,
          createdAt: { gt: lastRead },
          senderId: { not: userId },
        },
      });
      totalUnread += count;
    }
    return { totalUnread };
  }

  // ========== MARK AS READ ==========
  async markAsRead(roomId: string, userId: string) {
    await this.prisma.chatParticipant.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  // ========== ADMIN RESET ==========
  async resetAllChats() {
    await this.prisma.chatMessage.deleteMany({});
    await this.prisma.chatParticipant.deleteMany({});
    await this.prisma.chatRoom.deleteMany({});
  }
}