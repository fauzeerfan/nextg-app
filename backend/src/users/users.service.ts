import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // --- HELPER: Bersihkan Input Data ---
  // Mengubah string kosong "" menjadi null agar Prisma tidak error Foreign Key
  private cleanInputData(dto: any) {
    return {
      ...dto,
      departmentId: dto.departmentId === "" ? null : dto.departmentId,
      jobTitleId: dto.jobTitleId === "" ? null : dto.jobTitleId,
    };
  }

  // --- HELPER: Validasi Foreign Keys ---
  // Memastikan ID department dan job title benar-benar ada di DB sebelum dipakai
  private async validateForeignKeys(departmentId: string | null, jobTitleId: string | null) {
    if (departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) throw new BadRequestException(`Department with ID '${departmentId}' not found.`);
    }
    if (jobTitleId) {
      const job = await this.prisma.jobTitle.findUnique({ where: { id: jobTitleId } });
      if (!job) throw new BadRequestException(`Job Title with ID '${jobTitleId}' not found.`);
    }
  }

  async create(createUserDto: any) {
    // 1. Bersihkan Data Input (Handle empty string -> null)
    const cleanData = this.cleanInputData(createUserDto);

    // 2. Validasi Keberadaan Data Referensi
    await this.validateForeignKeys(cleanData.departmentId, cleanData.jobTitleId);

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(cleanData.password, 10);

    // 4. Simpan ke DB
    try {
      return await this.prisma.user.create({
        data: {
          username: cleanData.username,
          password: hashedPassword,
          fullName: cleanData.fullName,
          email: cleanData.email,
          roleId: cleanData.roleId,
          departmentId: cleanData.departmentId || null, 
          jobTitleId: cleanData.jobTitleId || null,     
          isActive: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Username or Email already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        role: { select: { name: true } },
        department: { select: { code: true, name: true } },
        jobTitle: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // FIX: Sanitasi Data sebelum Update
  async update(id: string, updateUserDto: any) {
    // 1. Pisahkan field yang valid untuk DB vs field sampah dari UI
    const {
      id: _id,          
      role,             
      department,       
      jobTitle,         
      status,           
      lastLogin,        
      avatarSeed,       
      password,         
      ...rawData      
    } = updateUserDto;
    
    // 2. Bersihkan Data (Empty string -> null)
    const cleanData = this.cleanInputData(rawData);

    // 3. Validasi Keberadaan Data Referensi (Penting untuk update)
    await this.validateForeignKeys(cleanData.departmentId, cleanData.jobTitleId);

    // 4. Handle Password Hashing
    if (password && password.trim() !== '') {
      cleanData.password = await bcrypt.hash(password, 10);
    } else {
      delete cleanData.password;
    }

    // 5. Eksekusi Update
    try {
      return await this.prisma.user.update({
        where: { id },
        data: cleanData,
      });
    } catch (error) {
        // Handle Unique Constraint (misal ganti username ke yang sudah ada)
        if (error.code === 'P2002') {
            throw new ConflictException('Username or Email already exists');
        }
        throw error;
    }
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}