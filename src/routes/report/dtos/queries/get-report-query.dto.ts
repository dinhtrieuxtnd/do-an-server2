import { createZodDto } from 'nestjs-zod'
import z from 'zod'

export const GetReportQuerySchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
})

export class GetReportQueryDto extends createZodDto(GetReportQuerySchema) {}
