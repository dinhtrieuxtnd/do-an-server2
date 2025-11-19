import { createZodDto } from 'nestjs-zod'
import z from 'zod'

export const GetClassroomReportQuerySchema = z.object({
    classroomId: z.coerce.number().int().positive(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
})

export class GetClassroomReportQueryDto extends createZodDto(GetClassroomReportQuerySchema) {}
