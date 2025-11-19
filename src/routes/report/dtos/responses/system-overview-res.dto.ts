import { createZodDto } from 'nestjs-zod'
import z from 'zod'

export const SystemOverviewResSchema = z.object({
    totalUsers: z.number().int(),
    totalStudents: z.number().int(),
    totalAdmins: z.number().int(),
    totalClassrooms: z.number().int(),
    activeClassrooms: z.number().int(),
    archivedClassrooms: z.number().int(),
    totalLessons: z.number().int(),
    totalExercises: z.number().int(),
    totalQuizzes: z.number().int(),
    totalSubmissions: z.number().int(),
    totalQuizAttempts: z.number().int(),
    averageClassroomSize: z.number(),
})

export class SystemOverviewResDto extends createZodDto(SystemOverviewResSchema) {}
