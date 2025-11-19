import { Injectable, Inject } from '@nestjs/common'
import { IReportService } from './report.interface.service'
import type { IReportRepo } from '../repos/report.interface.repo'
import { SystemOverviewResDto } from '../dtos/responses/system-overview-res.dto'
import { ClassroomReportResDto } from '../dtos/responses/classroom-report-res.dto'
import { StudentReportResDto } from '../dtos/responses/student-report-res.dto'
import { ExerciseStatsResDto } from '../dtos/responses/exercise-stats-res.dto'
import { QuizStatsResDto } from '../dtos/responses/quiz-stats-res.dto'
import { ActivityLogsResDto } from '../dtos/responses/activity-logs-res.dto'
import { GetReportQueryDto } from '../dtos/queries/get-report-query.dto'
import { GetClassroomReportQueryDto } from '../dtos/queries/get-classroom-report-query.dto'
import { GetStudentReportQueryDto } from '../dtos/queries/get-student-report-query.dto'
import { GetActivityLogsQueryDto } from '../dtos/queries/get-activity-logs-query.dto'

@Injectable()
export class ReportService implements IReportService {
    constructor(
        @Inject('IReportRepo') private readonly reportRepo: IReportRepo
    ) {}

    async getSystemOverview(query: GetReportQueryDto): Promise<SystemOverviewResDto> {
        const startDate = query.startDate ? new Date(query.startDate) : undefined
        const endDate = query.endDate ? new Date(query.endDate) : undefined
        
        return this.reportRepo.getSystemOverview(startDate, endDate)
    }

    async getClassroomReport(query: GetClassroomReportQueryDto): Promise<ClassroomReportResDto> {
        const startDate = query.startDate ? new Date(query.startDate) : undefined
        const endDate = query.endDate ? new Date(query.endDate) : undefined
        
        return this.reportRepo.getClassroomReport(query.classroomId, startDate, endDate)
    }

    async getStudentReport(query: GetStudentReportQueryDto): Promise<StudentReportResDto> {
        const startDate = query.startDate ? new Date(query.startDate) : undefined
        const endDate = query.endDate ? new Date(query.endDate) : undefined
        
        return this.reportRepo.getStudentReport(
            query.studentId, 
            query.classroomId, 
            startDate, 
            endDate
        )
    }

    async getExerciseStats(query: GetReportQueryDto): Promise<ExerciseStatsResDto> {
        const startDate = query.startDate ? new Date(query.startDate) : undefined
        const endDate = query.endDate ? new Date(query.endDate) : undefined
        
        return this.reportRepo.getExerciseStats(startDate, endDate)
    }

    async getQuizStats(query: GetReportQueryDto): Promise<QuizStatsResDto> {
        const startDate = query.startDate ? new Date(query.startDate) : undefined
        const endDate = query.endDate ? new Date(query.endDate) : undefined
        
        return this.reportRepo.getQuizStats(startDate, endDate)
    }

    async getActivityLogs(query: GetActivityLogsQueryDto): Promise<ActivityLogsResDto> {
        return this.reportRepo.getActivityLogs(query)
    }
}
