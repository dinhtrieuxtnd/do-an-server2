import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const ActivityLogItemSchema = z.object({
    id: z.bigint().or(z.number()),
    userId: z.number().int(),
    userName: z.string(),
    userEmail: z.string(),
    userRole: z.string(),
    action: z.string(),
    entityType: z.string(),
    entityId: z.number().int().nullable(),
    metadata: z.string().nullable(),
    createdAt: z.date(),
})

export const ActivityLogsResSchema = z.object({
    activities: z.array(ActivityLogItemSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
})

export class ActivityLogsResDto extends createZodDto(ActivityLogsResSchema) {}
