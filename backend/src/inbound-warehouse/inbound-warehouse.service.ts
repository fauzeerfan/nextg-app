import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { PutawayDto } from './dto/putaway.dto';

@Injectable()
export class InboundWarehouseService {
  constructor(private prisma: PrismaService) {}

  // ========== SUPPLIER CRUD ==========
  async createSupplier(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async findAllSuppliers() {
    return this.prisma.supplier.findMany({ orderBy: { code: 'asc' } });
  }

  async findSupplierById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    await this.findSupplierById(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async deleteSupplier(id: string) {
    await this.findSupplierById(id);
    return this.prisma.supplier.delete({ where: { id } });
  }

  // ========== MATERIAL CRUD ==========
  async createMaterial(dto: CreateMaterialDto) {
    return this.prisma.material.create({ data: dto });
  }

  async findAllMaterials() {
    return this.prisma.material.findMany({ orderBy: { materialNumber: 'asc' } });
  }

  async findMaterialById(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('Material not found');
    return material;
  }

  async updateMaterial(id: string, dto: UpdateMaterialDto) {
    await this.findMaterialById(id);
    return this.prisma.material.update({ where: { id }, data: dto });
  }

  async deleteMaterial(id: string) {
    await this.findMaterialById(id);
    return this.prisma.material.delete({ where: { id } });
  }

  // ========== PURCHASE ORDER CRUD ==========
  async createPurchaseOrder(dto: CreatePurchaseOrderDto) {
    const { details, ...headerData } = dto;
    return this.prisma.purchaseOrder.create({
      data: {
        ...headerData,
        orderDate: new Date(headerData.orderDate),
        expectedDate: headerData.expectedDate ? new Date(headerData.expectedDate) : undefined,
        details: {
          create: details.map(d => ({
            materialId: d.materialId,
            orderedQty: d.orderedQty,
            unitPrice: d.unitPrice,
          })),
        },
      },
      include: { details: true },
    });
  }

  async findAllPurchaseOrders() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true, details: { include: { material: true } } },
      orderBy: { orderDate: 'desc' },
    });
  }

  async findPurchaseOrderById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, details: { include: { material: true } } },
    });
    if (!po) throw new NotFoundException('Purchase Order not found');
    return po;
  }

  async updatePurchaseOrder(id: string, dto: UpdatePurchaseOrderDto) {
    await this.findPurchaseOrderById(id);
    const { details, ...headerData } = dto;
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...headerData,
        orderDate: headerData.orderDate ? new Date(headerData.orderDate) : undefined,
        expectedDate: headerData.expectedDate ? new Date(headerData.expectedDate) : undefined,
      },
    });
  }

  async deletePurchaseOrder(id: string) {
    await this.findPurchaseOrderById(id);
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }

  // ========== RECEIVING ==========
  async createReceiving(dto: CreateReceivingDto) {
    const grnNumber = `GRN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
    
    return this.prisma.$transaction(async (tx) => {
      const header = await tx.receivingHeader.create({
        data: {
          grnNumber,
          supplierId: dto.supplierId,
          poId: dto.poId,
          deliveryNoteNumber: dto.deliveryNoteNumber,
          note: dto.note,
          details: {
            create: dto.details.map(d => ({
              materialId: d.materialId,
              poDetailId: d.poDetailId,
              receivedQty: d.receivedQty,
              acceptedQty: d.acceptedQty,
              rejectedQty: d.rejectedQty,
              rejectionReason: d.rejectionReason,
              batchLotNumber: d.batchLotNumber,
            })),
          },
        },
        include: { details: true },
      });

      // Update receivedQty di PurchaseOrderDetail jika ada
      for (const detail of dto.details) {
        if (detail.poDetailId) {
          await tx.purchaseOrderDetail.update({
            where: { id: detail.poDetailId },
            data: { receivedQty: { increment: detail.acceptedQty } },
          });
        }
      }

      return header;
    });
  }

  async findAllReceivingHeaders() {
    return this.prisma.receivingHeader.findMany({
      include: { supplier: true, purchaseOrder: true, details: { include: { material: true } } },
      orderBy: { receivedDate: 'desc' },
    });
  }

  async findReceivingHeaderById(id: string) {
    const header = await this.prisma.receivingHeader.findUnique({
      where: { id },
      include: { supplier: true, purchaseOrder: true, details: { include: { material: true } } },
    });
    if (!header) throw new NotFoundException('Receiving header not found');
    return header;
  }

  async getPendingPutawayItems() {
    return this.prisma.receivingDetail.findMany({
      where: { status: 'PENDING_PUTAWAY' },
      include: {
        material: true,
        receivingHeader: { include: { supplier: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ========== PUTAWAY ==========
  async processPutaway(dto: PutawayDto) {
    const detail = await this.prisma.receivingDetail.findUnique({
      where: { id: dto.receivingDetailId },
    });
    if (!detail) throw new NotFoundException('Receiving detail not found');
    if (detail.status !== 'PENDING_PUTAWAY') {
      throw new BadRequestException('Item is already putaway or cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      // Buat inventory
      await tx.materialInventory.create({
        data: {
          materialId: detail.materialId,
          receivingDetailId: detail.id,
          storageLocation: dto.storageLocation,
          batchLotNumber: dto.batchLotNumber || detail.batchLotNumber,
          qtyOnHand: detail.acceptedQty,
          status: 'AVAILABLE',
        },
      });

      // Update status detail
      await tx.receivingDetail.update({
        where: { id: detail.id },
        data: { status: 'PUTAWAY_COMPLETED' },
      });

      // Cek apakah semua detail sudah putaway, jika iya update header
      const header = await tx.receivingHeader.findUnique({
        where: { id: detail.headerId },
        include: { details: true },
      });
      if (header && header.details.every(d => d.status === 'PUTAWAY_COMPLETED')) {
        await tx.receivingHeader.update({
          where: { id: header.id },
          data: { status: 'PUTAWAY_COMPLETED' },
        });
      }

      return { success: true };
    });
  }

  // ========== INVENTORY ==========
  async getMaterialInventory(materialId?: string) {
    const where = materialId ? { materialId } : {};
    return this.prisma.materialInventory.findMany({
      where,
      include: {
        material: true,
        receivingDetail: { include: { receivingHeader: { include: { supplier: true } } } },
      },
      orderBy: { material: { materialNumber: 'asc' } },
    });
  }
}