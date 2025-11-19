import { createZodDto } from 'nestjs-zod'
import z from 'zod'

export const GetStudentReportQuerySchema = z.object({
    studentId: z.coerce.number().int().positive(),
    classroomId: z.coerce.number().int().positive().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
})

export class GetStudentReportQueryDto extends createZodDto(GetStudentReportQuerySchema) {}
