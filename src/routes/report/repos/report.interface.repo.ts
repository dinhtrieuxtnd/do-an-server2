import { SystemOverviewResDto } from '../dtos/responses/system-overview-res.dto'
import { ClassroomReportResDto } from '../dtos/responses/classroom-report-res.dto'
import { StudentReportResDto } from '../dtos/responses/student-report-res.dto'
import { ExerciseStatsResDto } from '../dtos/responses/exercise-stats-res.dto'
import { QuizStatsResDto } from '../dtos/responses/quiz-stats-res.dto'
import { ActivityLogsResDto } from '../dtos/responses/activity-logs-res.dto'
import { GetActivityLogsQueryDto } from '../dtos/queries/get-activity-logs-query.dto'

export interface IReportRepo {
    getSystemOverview(startDate?: Date, endDate?: Date): Promise<SystemOverviewResDto>
    getClassroomReport(classroomId: number, startDate?: Date, endDate?: Date): Promise<ClassroomReportResDto>
    getStudentReport(studentId: number, classroomId?: number, startDate?: Date, endDate?: Date): Promise<StudentReportResDto>
    getExerciseStats(startDate?: Date, endDate?: Date): Promise<ExerciseStatsResDto>
    getQuizStats(startDate?: Date, endDate?: Date): Promise<QuizStatsResDto>
    getActivityLogs(query: GetActivityLogsQueryDto): Promise<ActivityLogsResDto>
}
