import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const countToday = await this.prisma.supportTicket.count({
      where: { createdAt: { gte: new Date(new Date().toDateString()) } }
    });
    // Generate ticket number: TKT-YYYYMMDD-XXXX
    const ticketNumber = `TKT-${today}-${String(countToday + 1).padStart(4,'0')}`;

    return this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject: dto.subject,
        category: dto.category,
        description: dto.description,
        priority: dto.priority || 'LOW',
      },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
      },
    });
  }

  async getTickets(userId: string, role: string, status?: string) {
    const where: any = {};
    if (role !== 'ADMINISTRATOR') {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }
    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  async getTicketById(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async sendMessage(ticketId: string, senderId: string, dto: SendMessageDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'CLOSED') throw new BadRequestException('Ticket is closed');

    return this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        senderId,
        message: dto.message,
      },
      include: {
        sender: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateTicket(ticketId: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
      },
      include: {
        user: { select: { id: true, fullName: true } },
        messages: { include: { sender: { select: { id: true, fullName: true } } } },
      },
    });
  }
}