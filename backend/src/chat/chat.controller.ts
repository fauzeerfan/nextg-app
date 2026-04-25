import {
  Controller, Get, Post, Param, Body, UseGuards, Req, Delete,
  UploadedFile, UseInterceptors, BadRequestException, Query,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const FILE_LIMIT = 5 * 1024 * 1024;
const ALLOWED_MIMES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
];

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ========== EXISTING ROOM & MESSAGE ENDPOINTS ==========
  @Get('rooms')
  async getRooms(@Req() req: any) {
    return this.chatService.getRoomsForUser(req.user.userId);
  }

  @Get('contacts')
  async getContacts(@Req() req: any) {
    return this.chatService.getContacts(req.user.userId);
  }

  @Post('rooms/personal')
  async createPersonalRoom(@Req() req: any, @Body() body: { targetUserId: string }) {
    return this.chatService.createPersonalRoom(req.user.userId, body.targetUserId);
  }

  @Get('rooms/:roomId/messages')
  async getMessages(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(roomId, {
      before: before ? new Date(before) : undefined,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Post('rooms/:roomId/messages')
  async sendMessage(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Body() body: { content?: string; fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string },
  ) {
    return this.chatService.sendMessage(roomId, req.user.userId, body);
  }

  // ========== EDIT & DELETE MESSAGE ==========
  @Patch('messages/:messageId')
  async editMessage(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Body() body: { content: string },
  ) {
    return this.chatService.editMessage(messageId, req.user.userId, body.content);
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Req() req: any,
    @Param('messageId') messageId: string,
  ) {
    await this.chatService.deleteMessage(messageId, req.user.userId);
    return { success: true };
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'chats'),
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: FILE_LIMIT },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('File type not allowed'), false);
        }
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return {
      url: `/uploads/chats/${file.filename}`,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    return this.chatService.getUnreadCount(req.user.userId);
  }

  @Post('rooms/:roomId/read')
  async markAsRead(@Req() req: any, @Param('roomId') roomId: string) {
    await this.chatService.markAsRead(roomId, req.user.userId);
    return { success: true };
  }

  @Delete('admin/reset')
  @Roles('ADMINISTRATOR')
  async resetAllChats() {
    await this.chatService.resetAllChats();
    return { success: true };
  }

  // ========== ADMIN ROOM MANAGEMENT ==========
  @Post('rooms')
  @Roles('ADMINISTRATOR')
  async createRoom(@Req() req: any, @Body() body: { name: string; type?: string; department?: string }) {
    return this.chatService.createRoom({ ...body, createdBy: req.user.userId });
  }

  @Patch('rooms/:roomId')
  @Roles('ADMINISTRATOR')
  async updateRoom(@Param('roomId') roomId: string, @Body() body: { name?: string; type?: string; department?: string }) {
    return this.chatService.updateRoom(roomId, body);
  }

  @Delete('rooms/:roomId')
  @Roles('ADMINISTRATOR')
  async deleteRoom(@Param('roomId') roomId: string) {
    await this.chatService.deleteRoom(roomId);
    return { success: true };
  }

  @Get('rooms/:roomId/participants')
  async getRoomParticipants(@Param('roomId') roomId: string) {
    return this.chatService.getRoomParticipants(roomId);
  }

  @Post('rooms/:roomId/participants')
  @Roles('ADMINISTRATOR')
  async addParticipant(@Param('roomId') roomId: string, @Body() body: { userId: string }) {
    return this.chatService.addParticipant(roomId, body.userId);
  }

  @Delete('rooms/:roomId/participants/:userId')
  @Roles('ADMINISTRATOR')
  async removeParticipant(@Param('roomId') roomId: string, @Param('userId') userId: string) {
    await this.chatService.removeParticipant(roomId, userId);
    return { success: true };
  }
}