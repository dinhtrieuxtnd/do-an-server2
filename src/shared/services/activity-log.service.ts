import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { IActivityLogService } from './activity-log.interface.service'
import { ActivityLog } from '@prisma/client'

@Injectable()
export class ActivityLogService implements IActivityLogService {
    constructor(private readonly prisma: PrismaService) {}

    async log(
        userId: number,
        action: string,
        entityType: string,
        entityId?: number,
        metadata?: Record<string, any>
    ): Promise<ActivityLog> {
        return this.prisma.activityLog.create({
            data: {
                userId,
                action,
                entityType,
                entityId,
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        })
    }

    async getUserActivities(
        userId: number,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ activities: ActivityLog[]; total: number }> {
        const [activities, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.activityLog.count({ where: { userId } }),
        ])

        return { activities, total }
    }

    async getRecentActivities(
        limit: number = 100,
        startDate?: Date,
        endDate?: Date
    ): Promise<ActivityLog[]> {
        const dateFilter = startDate && endDate ? {
            createdAt: {
                gte: startDate,
                lte: endDate,
            }
        } : {}

        return this.prisma.activityLog.findMany({
            where: dateFilter,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    }
                }
            }
        })
    }
}
