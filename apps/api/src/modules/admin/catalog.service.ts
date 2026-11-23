import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePhysicalRoomDto, CreateRoomTypeDto } from './dto/admin-contract.dto';
import { PhysicalRoomRecordDto, RoomTypeRecordDto } from './dto/catalog-response.dto';

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listRoomTypes(): Promise<RoomTypeRecordDto[]> {
    return this.prisma.roomType.findMany({ orderBy: { code: 'asc' } });
  }

  async getRoomType(code: string): Promise<RoomTypeRecordDto> {
    const roomType = await this.prisma.roomType.findUnique({ where: { code } });
    if (!roomType) throw new NotFoundException(`Room type '${code}' does not exist.`);
    return roomType;
  }

  async createRoomType(dto: CreateRoomTypeDto): Promise<RoomTypeRecordDto> {
    try {
      return await this.prisma.roomType.create({ data: dto });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`Room type code '${dto.code}' already exists.`);
      }
      throw error;
    }
  }

  async listPhysicalRooms(): Promise<PhysicalRoomRecordDto[]> {
    const records = await this.prisma.physicalRoom.findMany({
      orderBy: { number: 'asc' },
      include: { roomType: { select: { code: true } } },
    });
    return records.map(({ roomType, ...room }) => ({ ...room, roomTypeCode: roomType.code }));
  }

  async getPhysicalRoom(number: string): Promise<PhysicalRoomRecordDto> {
    const record = await this.prisma.physicalRoom.findUnique({
      where: { number },
      include: { roomType: { select: { code: true } } },
    });
    if (!record) throw new NotFoundException(`Physical room '${number}' does not exist.`);
    const { roomType, ...room } = record;
    return { ...room, roomTypeCode: roomType.code };
  }

  async createPhysicalRoom(dto: CreatePhysicalRoomDto): Promise<PhysicalRoomRecordDto> {
    const roomType = await this.prisma.roomType.findUnique({ where: { code: dto.roomTypeCode } });
    if (!roomType) {
      throw new NotFoundException(`Room type '${dto.roomTypeCode}' does not exist.`);
    }

    try {
      const record = await this.prisma.physicalRoom.create({
        data: { number: dto.number, floor: dto.floor, roomTypeId: roomType.id },
      });
      return { ...record, roomTypeCode: roomType.code };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(`Physical room number '${dto.number}' already exists.`);
      }
      throw error;
    }
  }
}
