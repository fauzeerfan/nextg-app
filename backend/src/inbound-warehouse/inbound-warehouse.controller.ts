import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { InboundWarehouseService } from './inbound-warehouse.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { PutawayDto } from './dto/putaway.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('inbound-warehouse')
@UseGuards(JwtAuthGuard)
export class InboundWarehouseController {
  constructor(private readonly service: InboundWarehouseService) {}

  // ========== SUPPLIERS ==========
  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.service.createSupplier(dto);
  }

  @Get('suppliers')
  findAllSuppliers() {
    return this.service.findAllSuppliers();
  }

  @Get('suppliers/:id')
  findSupplierById(@Param('id') id: string) {
    return this.service.findSupplierById(id);
  }

  @Patch('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  deleteSupplier(@Param('id') id: string) {
    return this.service.deleteSupplier(id);
  }

  // ========== MATERIALS ==========
  @Post('materials')
  createMaterial(@Body() dto: CreateMaterialDto) {
    return this.service.createMaterial(dto);
  }

  @Get('materials')
  findAllMaterials() {
    return this.service.findAllMaterials();
  }

  @Get('materials/:id')
  findMaterialById(@Param('id') id: string) {
    return this.service.findMaterialById(id);
  }

  @Patch('materials/:id')
  updateMaterial(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.service.updateMaterial(id, dto);
  }

  @Delete('materials/:id')
  deleteMaterial(@Param('id') id: string) {
    return this.service.deleteMaterial(id);
  }

  // ========== PURCHASE ORDERS ==========
  @Post('purchase-orders')
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto) {
    return this.service.createPurchaseOrder(dto);
  }

  @Get('purchase-orders')
  findAllPurchaseOrders() {
    return this.service.findAllPurchaseOrders();
  }

  @Get('purchase-orders/:id')
  findPurchaseOrderById(@Param('id') id: string) {
    return this.service.findPurchaseOrderById(id);
  }

  @Patch('purchase-orders/:id')
  updatePurchaseOrder(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.service.updatePurchaseOrder(id, dto);
  }

  @Delete('purchase-orders/:id')
  deletePurchaseOrder(@Param('id') id: string) {
    return this.service.deletePurchaseOrder(id);
  }

  // ========== RECEIVING ==========
  @Post('receiving')
  createReceiving(@Body() dto: CreateReceivingDto) {
    return this.service.createReceiving(dto);
  }

  @Get('receiving')
  findAllReceivingHeaders() {
    return this.service.findAllReceivingHeaders();
  }

  @Get('receiving/:id')
  findReceivingHeaderById(@Param('id') id: string) {
    return this.service.findReceivingHeaderById(id);
  }

  @Get('pending-putaway')
  getPendingPutawayItems() {
    return this.service.getPendingPutawayItems();
  }

  // ========== PUTAWAY ==========
  @Post('putaway')
  processPutaway(@Body() dto: PutawayDto) {
    return this.service.processPutaway(dto);
  }

  // ========== INVENTORY ==========
  @Get('inventory')
  getMaterialInventory(@Query('materialId') materialId?: string) {
    return this.service.getMaterialInventory(materialId);
  }
}