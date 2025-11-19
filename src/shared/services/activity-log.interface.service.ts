import { ActivityLog } from '@prisma/client'

export interface IActivityLogService {
    log(
        userId: number,
        action: string,
        entityType: string,
        entityId?: number,
        metadata?: Record<string, any>
    ): Promise<ActivityLog>

    getUserActivities(
        userId: number,
        limit?: number,
        offset?: number
    ): Promise<{ activities: ActivityLog[]; total: number }>

    getRecentActivities(
        limit?: number,
        startDate?: Date,
        endDate?: Date
    ): Promise<ActivityLog[]>
}
