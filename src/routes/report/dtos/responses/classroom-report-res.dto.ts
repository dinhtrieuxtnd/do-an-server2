import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const StudentPerformanceSchema = z.object({
    studentId: z.number().int(),
    studentName: z.string(),
    studentEmail: z.string(),
    totalSubmissions: z.number().int(),
    averageExerciseScore: z.number().nullable(),
    totalQuizAttempts: z.number().int(),
    averageQuizScore: z.number().nullable(),
    overallScore: z.number().nullable(),
})

export const ClassroomReportResSchema = z.object({
    classroomId: z.number().int(),
    classroomName: z.string(),
    totalStudents: z.number().int(),
    activeStudents: z.number().int(),
    totalLessons: z.number().int(),
    totalExercises: z.number().int(),
    totalQuizzes: z.number().int(),
    totalSubmissions: z.number().int(),
    totalQuizAttempts: z.number().int(),
    averageExerciseScore: z.number().nullable(),
    averageQuizScore: z.number().nullable(),
    submissionRate: z.number(),
    quizCompletionRate: z.number(),
    topPerformers: z.array(StudentPerformanceSchema),
})

export class ClassroomReportResDto extends createZodDto(ClassroomReportResSchema) {}
