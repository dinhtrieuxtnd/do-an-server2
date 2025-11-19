import { Controller, Get, Query, UseGuards, Inject } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { RoleGuard } from 'src/shared/guards/role.guard'
import { Role } from '@prisma/client'
import { Roles } from 'src/shared/decorators/roles.decorator'
import type { IReportService } from './services/report.interface.service'
import { SystemOverviewResDto } from './dtos/responses/system-overview-res.dto'
import { ClassroomReportResDto } from './dtos/responses/classroom-report-res.dto'
import { StudentReportResDto } from './dtos/responses/student-report-res.dto'
import { ExerciseStatsResDto } from './dtos/responses/exercise-stats-res.dto'
import { QuizStatsResDto } from './dtos/responses/quiz-stats-res.dto'
import { ActivityLogsResDto } from './dtos/responses/activity-logs-res.dto'
import { GetReportQueryDto } from './dtos/queries/get-report-query.dto'
import { GetClassroomReportQueryDto } from './dtos/queries/get-classroom-report-query.dto'
import { GetStudentReportQueryDto } from './dtos/queries/get-student-report-query.dto'
import { GetActivityLogsQueryDto } from './dtos/queries/get-activity-logs-query.dto'

@UseGuards(RoleGuard)
@Controller('report')
export class ReportController {
    constructor(@Inject('IReportService') private readonly reportService: IReportService) {}

    /**
     * Lấy tổng quan thống kê hệ thống
     * GET /report/system-overview
     */
    @Roles(Role.admin)
    @Get('system-overview')
    @ZodSerializerDto(SystemOverviewResDto)
    async getSystemOverview(@Query() query: GetReportQueryDto): Promise<SystemOverviewResDto> {
        return this.reportService.getSystemOverview(query)
    }

    /**
     * Lấy báo cáo chi tiết của một lớp học
     * GET /report/classroom?classroomId=1
     */
    @Roles(Role.admin)
    @Get('classroom')
    @ZodSerializerDto(ClassroomReportResDto)
    async getClassroomReport(@Query() query: GetClassroomReportQueryDto): Promise<ClassroomReportResDto> {
        return this.reportService.getClassroomReport(query)
    }

    /**
     * Lấy báo cáo chi tiết của một học sinh
     * GET /report/student?studentId=1&classroomId=1
     */
    @Roles(Role.admin)
    @Get('student')
    @ZodSerializerDto(StudentReportResDto)
    async getStudentReport(@Query() query: GetStudentReportQueryDto): Promise<StudentReportResDto> {
        return this.reportService.getStudentReport(query)
    }

    /**
     * Lấy thống kê bài tập
     * GET /report/exercises
     */
    @Roles(Role.admin)
    @Get('exercises')
    @ZodSerializerDto(ExerciseStatsResDto)
    async getExerciseStats(@Query() query: GetReportQueryDto): Promise<ExerciseStatsResDto> {
        return this.reportService.getExerciseStats(query)
    }

    /**
     * Lấy thống kê bài kiểm tra
     * GET /report/quizzes
     */
    @Roles(Role.admin)
    @Get('quizzes')
    @ZodSerializerDto(QuizStatsResDto)
    async getQuizStats(@Query() query: GetReportQueryDto): Promise<QuizStatsResDto> {
        return this.reportService.getQuizStats(query)
    }

    /**
     * Lấy lịch sử hoạt động của người dùng
     * GET /report/activity-logs?userId=1&entityType=classroom&action=create
     */
    @Roles(Role.admin)
    @Get('activity-logs')
    @ZodSerializerDto(ActivityLogsResDto)
    async getActivityLogs(@Query() query: GetActivityLogsQueryDto): Promise<ActivityLogsResDto> {
        return this.reportService.getActivityLogs(query)
    }
}
