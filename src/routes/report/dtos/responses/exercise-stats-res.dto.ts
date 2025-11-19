import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const ExerciseStatSchema = z.object({
    exerciseId: z.number().int(),
    exerciseTitle: z.string(),
    classroomName: z.string(),
    totalSubmissions: z.number().int(),
    averageScore: z.number().nullable(),
    highestScore: z.number().nullable(),
    lowestScore: z.number().nullable(),
    submissionRate: z.number(),
})

export const ExerciseStatsResSchema = z.object({
    exercises: z.array(ExerciseStatSchema),
    totalExercises: z.number().int(),
    averageSubmissionRate: z.number(),
})

export class ExerciseStatsResDto extends createZodDto(ExerciseStatsResSchema) {}
