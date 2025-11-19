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

export interface IReportService {
    getSystemOverview(query: GetReportQueryDto): Promise<SystemOverviewResDto>
    getClassroomReport(query: GetClassroomReportQueryDto): Promise<ClassroomReportResDto>
    getStudentReport(query: GetStudentReportQueryDto): Promise<StudentReportResDto>
    getExerciseStats(query: GetReportQueryDto): Promise<ExerciseStatsResDto>
    getQuizStats(query: GetReportQueryDto): Promise<QuizStatsResDto>
    getActivityLogs(query: GetActivityLogsQueryDto): Promise<ActivityLogsResDto>
}
