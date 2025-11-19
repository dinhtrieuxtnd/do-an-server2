import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const QuizStatSchema = z.object({
    quizId: z.number().int(),
    quizTitle: z.string(),
    classroomName: z.string(),
    totalAttempts: z.number().int(),
    uniqueStudents: z.number().int(),
    averageScore: z.number().nullable(),
    highestScore: z.number().nullable(),
    lowestScore: z.number().nullable(),
    completionRate: z.number(),
    averageTimeSpent: z.number().nullable(),
})

export const QuizStatsResSchema = z.object({
    quizzes: z.array(QuizStatSchema),
    totalQuizzes: z.number().int(),
    averageCompletionRate: z.number(),
})

export class QuizStatsResDto extends createZodDto(QuizStatsResSchema) {}
