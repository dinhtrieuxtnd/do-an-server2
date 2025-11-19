import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const ClassroomPerformanceSchema = z.object({
    classroomId: z.number().int(),
    classroomName: z.string(),
    totalSubmissions: z.number().int(),
    averageExerciseScore: z.number().nullable(),
    totalQuizAttempts: z.number().int(),
    averageQuizScore: z.number().nullable(),
})

const RecentActivitySchema = z.object({
    activityType: z.string(),
    lessonTitle: z.string().nullable(),
    score: z.number().nullable(),
    submittedAt: z.date(),
})

export const StudentReportResSchema = z.object({
    studentId: z.number().int(),
    studentName: z.string(),
    studentEmail: z.string(),
    totalClassrooms: z.number().int(),
    totalSubmissions: z.number().int(),
    averageExerciseScore: z.number().nullable(),
    totalQuizAttempts: z.number().int(),
    averageQuizScore: z.number().nullable(),
    overallScore: z.number().nullable(),
    classroomPerformances: z.array(ClassroomPerformanceSchema),
    recentActivities: z.array(RecentActivitySchema),
})

export class StudentReportResDto extends createZodDto(StudentReportResSchema) {}
