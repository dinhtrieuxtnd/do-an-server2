import { createZodDto } from 'nestjs-zod'
import z from 'zod'

export const GetActivityLogsQuerySchema = z.object({
    userId: z.coerce.number().int().positive().optional(),
    entityType: z.string().optional(),
    action: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.coerce.number().int().positive().default(100),
    offset: z.coerce.number().int().min(0).default(0),
})

export class GetActivityLogsQueryDto extends createZodDto(GetActivityLogsQuerySchema) {}
