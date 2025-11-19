import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { IReportRepo } from './report.interface.repo'
import { SystemOverviewResDto } from '../dtos/responses/system-overview-res.dto'
import { ClassroomReportResDto } from '../dtos/responses/classroom-report-res.dto'
import { StudentReportResDto } from '../dtos/responses/student-report-res.dto'
import { ExerciseStatsResDto } from '../dtos/responses/exercise-stats-res.dto'
import { QuizStatsResDto } from '../dtos/responses/quiz-stats-res.dto'
import { ActivityLogsResDto } from '../dtos/responses/activity-logs-res.dto'
import { GetActivityLogsQueryDto } from '../dtos/queries/get-activity-logs-query.dto'
import { Role } from '@prisma/client'

@Injectable()
export class ReportRepo implements IReportRepo {
    constructor(private readonly prisma: PrismaService) {}

    async getSystemOverview(startDate?: Date, endDate?: Date): Promise<SystemOverviewResDto> {
        const dateFilter = startDate && endDate ? {
            createdAt: {
                gte: startDate,
                lte: endDate,
            }
        } : {}

        const [
            totalUsers,
            totalStudents,
            totalAdmins,
            totalClassrooms,
            activeClassrooms,
            archivedClassrooms,
            totalLessons,
            totalExercises,
            totalQuizzes,
            totalSubmissions,
            totalQuizAttempts,
            classroomStudentCounts,
        ] = await Promise.all([
            this.prisma.user.count({ where: { isActive: true } }),
            this.prisma.user.count({ where: { role: Role.student, isActive: true } }),
            this.prisma.user.count({ where: { role: Role.admin, isActive: true } }),
            this.prisma.classroom.count({ where: { deletedAt: null } }),
            this.prisma.classroom.count({ where: { isArchived: false, deletedAt: null } }),
            this.prisma.classroom.count({ where: { isArchived: true, deletedAt: null } }),
            this.prisma.lesson.count({ where: { deletedAt: null, ...dateFilter } }),
            this.prisma.exercise.count({ where: { deletedAt: null, ...dateFilter } }),
            this.prisma.quiz.count({ where: { deletedAt: null, ...dateFilter } }),
            this.prisma.exerciseSubmission.count(),
            this.prisma.quizAttempt.count({ where: { status: 'submitted' } }),
            this.prisma.classroomStudent.groupBy({
                by: ['classroomId'],
                _count: { studentId: true },
                where: { isActive: true, deletedAt: null }
            }),
        ])

        const averageClassroomSize = classroomStudentCounts.length > 0
            ? classroomStudentCounts.reduce((sum, c) => sum + c._count.studentId, 0) / classroomStudentCounts.length
            : 0

        return {
            totalUsers,
            totalStudents,
            totalAdmins,
            totalClassrooms,
            activeClassrooms,
            archivedClassrooms,
            totalLessons,
            totalExercises,
            totalQuizzes,
            totalSubmissions,
            totalQuizAttempts,
            averageClassroomSize: Math.round(averageClassroomSize * 100) / 100,
        }
    }

    async getClassroomReport(classroomId: number, startDate?: Date, endDate?: Date): Promise<ClassroomReportResDto> {
        const dateFilter = startDate && endDate ? {
            createdAt: {
                gte: startDate,
                lte: endDate,
            }
        } : {}

        const classroom = await this.prisma.classroom.findUniqueOrThrow({
            where: { id: classroomId },
            select: { id: true, name: true }
        })

        const lessons = await this.prisma.lesson.findMany({
            where: { classroomId, deletedAt: null, ...dateFilter },
            select: {
                id: true,
                lessonType: true,
                exerciseId: true,
                quizId: true,
            }
        })

        const lessonIds = lessons.map(l => l.id)
        const exerciseIds = lessons.filter(l => l.exerciseId).map(l => l.exerciseId!)
        const quizIds = lessons.filter(l => l.quizId).map(l => l.quizId!)

        const [
            totalStudents,
            activeStudents,
            submissions,
            quizAttempts,
        ] = await Promise.all([
            this.prisma.classroomStudent.count({ 
                where: { classroomId, deletedAt: null } 
            }),
            this.prisma.classroomStudent.count({ 
                where: { classroomId, isActive: true, deletedAt: null } 
            }),
            this.prisma.exerciseSubmission.findMany({
                where: { 
                    lessonId: { in: lessonIds },
                    exerciseId: { in: exerciseIds }
                },
                select: { score: true, studentId: true }
            }),
            this.prisma.quizAttempt.findMany({
                where: { 
                    lessonId: { in: lessonIds },
                    quizId: { in: quizIds },
                    status: 'submitted'
                },
                select: { scoreScaled10: true, studentId: true }
            }),
        ])

        // Tính điểm trung bình
        const exerciseScores = submissions.filter(s => s.score !== null).map(s => s.score!)
        const quizScores = quizAttempts.filter(a => a.scoreScaled10 !== null).map(a => a.scoreScaled10!)
        
        const averageExerciseScore = exerciseScores.length > 0 
            ? exerciseScores.reduce((sum, score) => sum + score, 0) / exerciseScores.length 
            : null

        const averageQuizScore = quizScores.length > 0 
            ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length 
            : null

        // Tính tỷ lệ hoàn thành
        const submissionRate = exerciseIds.length > 0 && activeStudents > 0
            ? (submissions.length / (exerciseIds.length * activeStudents)) * 100
            : 0

        const quizCompletionRate = quizIds.length > 0 && activeStudents > 0
            ? (new Set(quizAttempts.map(a => a.studentId)).size / activeStudents) * 100
            : 0

        // Top performers
        const studentPerformances = await this.prisma.classroomStudent.findMany({
            where: { classroomId, isActive: true, deletedAt: null },
            select: {
                studentId: true,
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    }
                }
            },
            take: 10,
        })

        const topPerformers = await Promise.all(
            studentPerformances.map(async (cs) => {
                const studentSubmissions = submissions.filter(s => s.studentId === cs.studentId)
                const studentAttempts = quizAttempts.filter(a => a.studentId === cs.studentId)

                const avgExerciseScore = studentSubmissions.length > 0
                    ? studentSubmissions.filter(s => s.score !== null).reduce((sum, s) => sum + s.score!, 0) / studentSubmissions.filter(s => s.score !== null).length
                    : null

                const avgQuizScore = studentAttempts.length > 0
                    ? studentAttempts.filter(a => a.scoreScaled10 !== null).reduce((sum, a) => sum + a.scoreScaled10!, 0) / studentAttempts.filter(a => a.scoreScaled10 !== null).length
                    : null

                const overallScore = avgExerciseScore !== null && avgQuizScore !== null
                    ? (avgExerciseScore + avgQuizScore) / 2
                    : avgExerciseScore !== null 
                        ? avgExerciseScore 
                        : avgQuizScore

                return {
                    studentId: cs.student.id,
                    studentName: cs.student.fullName,
                    studentEmail: cs.student.email,
                    totalSubmissions: studentSubmissions.length,
                    averageExerciseScore: avgExerciseScore,
                    totalQuizAttempts: studentAttempts.length,
                    averageQuizScore: avgQuizScore,
                    overallScore,
                }
            })
        )

        // Sắp xếp theo điểm tổng hợp
        topPerformers.sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))

        return {
            classroomId: classroom.id,
            classroomName: classroom.name,
            totalStudents,
            activeStudents,
            totalLessons: lessons.length,
            totalExercises: exerciseIds.length,
            totalQuizzes: quizIds.length,
            totalSubmissions: submissions.length,
            totalQuizAttempts: quizAttempts.length,
            averageExerciseScore,
            averageQuizScore,
            submissionRate: Math.round(submissionRate * 100) / 100,
            quizCompletionRate: Math.round(quizCompletionRate * 100) / 100,
            topPerformers: topPerformers.slice(0, 5),
        }
    }

    async getStudentReport(studentId: number, classroomId?: number, startDate?: Date, endDate?: Date): Promise<StudentReportResDto> {
        const student = await this.prisma.user.findUniqueOrThrow({
            where: { id: studentId },
            select: { id: true, fullName: true, email: true }
        })

        const classroomFilter = classroomId ? { classroomId } : {}

        const [classrooms, submissions, quizAttempts] = await Promise.all([
            this.prisma.classroomStudent.findMany({
                where: { 
                    studentId, 
                    isActive: true, 
                    deletedAt: null,
                    ...classroomFilter
                },
                select: {
                    classroomId: true,
                    classroom: {
                        select: { id: true, name: true }
                    }
                }
            }),
            this.prisma.exerciseSubmission.findMany({
                where: { 
                    studentId,
                    ...(startDate && endDate ? {
                        submittedAt: {
                            gte: startDate,
                            lte: endDate,
                        }
                    } : {})
                },
                select: {
                    lessonId: true,
                    score: true,
                    submittedAt: true,
                    lesson: {
                        select: {
                            classroomId: true,
                            exercise: {
                                select: { title: true }
                            }
                        }
                    }
                }
            }),
            this.prisma.quizAttempt.findMany({
                where: { 
                    studentId,
                    status: 'submitted',
                    ...(startDate && endDate ? {
                        submittedAt: {
                            gte: startDate,
                            lte: endDate,
                        }
                    } : {})
                },
                select: {
                    lessonId: true,
                    scoreScaled10: true,
                    submittedAt: true,
                    lesson: {
                        select: {
                            classroomId: true,
                            quiz: {
                                select: { title: true }
                            }
                        }
                    }
                }
            }),
        ])

        // Tính điểm trung bình
        const exerciseScores = submissions.filter(s => s.score !== null).map(s => s.score!)
        const quizScores = quizAttempts.filter(a => a.scoreScaled10 !== null).map(a => a.scoreScaled10!)
        
        const averageExerciseScore = exerciseScores.length > 0 
            ? exerciseScores.reduce((sum, score) => sum + score, 0) / exerciseScores.length 
            : null

        const averageQuizScore = quizScores.length > 0 
            ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length 
            : null

        const overallScore = averageExerciseScore !== null && averageQuizScore !== null
            ? (averageExerciseScore + averageQuizScore) / 2
            : averageExerciseScore !== null 
                ? averageExerciseScore 
                : averageQuizScore

        // Hiệu suất theo lớp
        const classroomPerformances = classrooms.map(cs => {
            const classSubmissions = submissions.filter(s => s.lesson.classroomId === cs.classroomId)
            const classAttempts = quizAttempts.filter(a => a.lesson.classroomId === cs.classroomId)

            const avgExerciseScore = classSubmissions.length > 0
                ? classSubmissions.filter(s => s.score !== null).reduce((sum, s) => sum + s.score!, 0) / classSubmissions.filter(s => s.score !== null).length
                : null

            const avgQuizScore = classAttempts.length > 0
                ? classAttempts.filter(a => a.scoreScaled10 !== null).reduce((sum, a) => sum + a.scoreScaled10!, 0) / classAttempts.filter(a => a.scoreScaled10 !== null).length
                : null

            return {
                classroomId: cs.classroom.id,
                classroomName: cs.classroom.name,
                totalSubmissions: classSubmissions.length,
                averageExerciseScore: avgExerciseScore,
                totalQuizAttempts: classAttempts.length,
                averageQuizScore: avgQuizScore,
            }
        })

        // Hoạt động gần đây
        const recentActivities = [
            ...submissions.map(s => ({
                activityType: 'exercise',
                lessonTitle: s.lesson.exercise?.title ?? null,
                score: s.score,
                submittedAt: s.submittedAt,
            })),
            ...quizAttempts.map(a => ({
                activityType: 'quiz',
                lessonTitle: a.lesson.quiz?.title ?? null,
                score: a.scoreScaled10,
                submittedAt: a.submittedAt!,
            })),
        ]
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .slice(0, 10)

        return {
            studentId: student.id,
            studentName: student.fullName,
            studentEmail: student.email,
            totalClassrooms: classrooms.length,
            totalSubmissions: submissions.length,
            averageExerciseScore,
            totalQuizAttempts: quizAttempts.length,
            averageQuizScore,
            overallScore,
            classroomPerformances,
            recentActivities,
        }
    }

    async getExerciseStats(startDate?: Date, endDate?: Date): Promise<ExerciseStatsResDto> {
        const dateFilter = startDate && endDate ? {
            createdAt: {
                gte: startDate,
                lte: endDate,
            }
        } : {}

        const exercises = await this.prisma.exercise.findMany({
            where: { deletedAt: null, ...dateFilter },
            select: {
                id: true,
                title: true,
                lessons: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        classroom: {
                            select: { name: true }
                        },
                        _count: {
                            select: {
                                exerciseSubmissions: true
                            }
                        }
                    }
                },
                submissions: {
                    select: { score: true }
                }
            },
            take: 50,
        })

        const exerciseStats = await Promise.all(
            exercises.map(async (ex) => {
                const lesson = ex.lessons[0]
                if (!lesson) {
                    return null
                }

                const classroomName = lesson.classroom.name
                const scores = ex.submissions.filter(s => s.score !== null).map(s => s.score!)
                
                const totalStudents = await this.prisma.classroomStudent.count({
                    where: {
                        classroomId: lesson.id,
                        isActive: true,
                        deletedAt: null
                    }
                })

                const averageScore = scores.length > 0 
                    ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
                    : null

                const highestScore = scores.length > 0 ? Math.max(...scores) : null
                const lowestScore = scores.length > 0 ? Math.min(...scores) : null
                const submissionRate = totalStudents > 0 
                    ? (ex.submissions.length / totalStudents) * 100 
                    : 0

                return {
                    exerciseId: ex.id,
                    exerciseTitle: ex.title,
                    classroomName,
                    totalSubmissions: ex.submissions.length,
                    averageScore,
                    highestScore,
                    lowestScore,
                    submissionRate: Math.round(submissionRate * 100) / 100,
                }
            })
        )

        const validStats = exerciseStats.filter((s): s is NonNullable<typeof s> => s !== null)
        const averageSubmissionRate = validStats.length > 0
            ? validStats.reduce((sum, s) => sum + s.submissionRate, 0) / validStats.length
            : 0

        return {
            exercises: validStats,
            totalExercises: validStats.length,
            averageSubmissionRate: Math.round(averageSubmissionRate * 100) / 100,
        }
    }

    async getQuizStats(startDate?: Date, endDate?: Date): Promise<QuizStatsResDto> {
        const dateFilter = startDate && endDate ? {
            createdAt: {
                gte: startDate,
                lte: endDate,
            }
        } : {}

        const quizzes = await this.prisma.quiz.findMany({
            where: { deletedAt: null, ...dateFilter },
            select: {
                id: true,
                title: true,
                timeLimitSec: true,
                lessons: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        classroom: {
                            select: { name: true }
                        }
                    }
                },
                attempts: {
                    where: { status: 'submitted' },
                    select: { 
                        scoreScaled10: true,
                        studentId: true,
                        startedAt: true,
                        submittedAt: true,
                    }
                }
            },
            take: 50,
        })

        const quizStats = quizzes.map(quiz => {
            const lesson = quiz.lessons[0]
            if (!lesson) {
                return null
            }

            const classroomName = lesson.classroom.name
            const scores = quiz.attempts.filter(a => a.scoreScaled10 !== null).map(a => a.scoreScaled10!)
            const uniqueStudents = new Set(quiz.attempts.map(a => a.studentId)).size

            const averageScore = scores.length > 0 
                ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
                : null

            const highestScore = scores.length > 0 ? Math.max(...scores) : null
            const lowestScore = scores.length > 0 ? Math.min(...scores) : null

            // Tính thời gian trung bình (giây)
            const timesSpent = quiz.attempts
                .filter(a => a.submittedAt)
                .map(a => (a.submittedAt!.getTime() - a.startedAt.getTime()) / 1000)
            
            const averageTimeSpent = timesSpent.length > 0
                ? timesSpent.reduce((sum, time) => sum + time, 0) / timesSpent.length
                : null

            return {
                quizId: quiz.id,
                quizTitle: quiz.title,
                classroomName,
                totalAttempts: quiz.attempts.length,
                uniqueStudents,
                averageScore,
                highestScore,
                lowestScore,
                completionRate: 0, // Sẽ tính sau
                averageTimeSpent,
            }
        }).filter(s => s !== null)

        // Tính completion rate cho mỗi quiz
        const statsWithCompletion = await Promise.all(
            quizStats.map(async (stat) => {
                if (!stat) return null

                const lesson = await this.prisma.lesson.findFirst({
                    where: { 
                        quizId: stat.quizId,
                        deletedAt: null
                    },
                    select: { classroomId: true }
                })

                if (!lesson) return stat

                const totalStudents = await this.prisma.classroomStudent.count({
                    where: {
                        classroomId: lesson.classroomId,
                        isActive: true,
                        deletedAt: null
                    }
                })

                const completionRate = totalStudents > 0 
                    ? (stat.uniqueStudents / totalStudents) * 100 
                    : 0

                return {
                    ...stat,
                    completionRate: Math.round(completionRate * 100) / 100,
                }
            })
        )

        const validStats = statsWithCompletion.filter(s => s !== null) as any[]
        const averageCompletionRate = validStats.length > 0
            ? validStats.reduce((sum, s) => sum + s.completionRate, 0) / validStats.length
            : 0

        return {
            quizzes: validStats,
            totalQuizzes: validStats.length,
            averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
        }
    }

    async getActivityLogs(query: GetActivityLogsQueryDto): Promise<ActivityLogsResDto> {
        const where: any = {}

        if (query.userId) {
            where.userId = query.userId
        }

        if (query.entityType) {
            where.entityType = query.entityType
        }

        if (query.action) {
            where.action = query.action
        }

        if (query.startDate && query.endDate) {
            where.createdAt = {
                gte: new Date(query.startDate),
                lte: new Date(query.endDate),
            }
        }

        const [activities, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: query.limit,
                skip: query.offset,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            role: true,
                        }
                    }
                }
            }),
            this.prisma.activityLog.count({ where }),
        ])

        return {
            activities: activities.map(activity => ({
                id: activity.id,
                userId: activity.userId,
                userName: activity.user.fullName,
                userEmail: activity.user.email,
                userRole: activity.user.role,
                action: activity.action,
                entityType: activity.entityType,
                entityId: activity.entityId,
                metadata: activity.metadata,
                createdAt: activity.createdAt,
            })),
            total,
            limit: query.limit,
            offset: query.offset,
        }
    }
}
