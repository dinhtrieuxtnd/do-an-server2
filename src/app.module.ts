import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SharedModule } from './shared/shared.module'
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { AuthModule } from './routes/auth/auth.module'
import CustomZodValidationPipe from './shared/pipes/custom-zod-validation.pipe'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { ThrottlerModule } from '@nestjs/throttler'
import { CustomThrottlerGuard } from './shared/guards/throttler.guard'
import { AccessTokenGuard } from './shared/guards/access-token.guard'
import { ProfileModule } from './routes/profile/profile.module'
import { MediaModule } from './routes/media/media.module'
import { UserModule } from './routes/user/user.module';
import { ClassroomModule } from './routes/classroom/classroom.module';
import { ClrstdModule } from './routes/clrstd/clrstd.module';
import { LectureModule } from './routes/lecture/lecture.module';
import { ExerciseModule } from './routes/exercise/exercise.module';
import { QuizModule } from './routes/quiz/quiz.module';
import { LessonModule } from './routes/lesson/lesson.module';
import { ExerciseSubmissionModule } from './routes/exercise-submission/exercise-submission.module';
import { QuizAttemptModule } from './routes/quiz-attempt/quiz-attempt.module';
import { ReportModule } from './routes/report/report.module'
import { ActivityLogInterceptor } from './shared/interceptors/activity-log.interceptor'

@Module({
    imports: [
        SharedModule,
        AuthModule,
        ThrottlerModule.forRoot([
            {
                ttl: 60000,
                limit: 10,
            },
        ]),
        ProfileModule,
        MediaModule,
        UserModule,
        ClassroomModule,
        ClrstdModule,
        LectureModule,
        ExerciseModule,
        QuizModule,
        LessonModule,
        ExerciseSubmissionModule,
        QuizAttemptModule,
        ReportModule
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
        {
            provide: APP_PIPE,
            useClass: CustomZodValidationPipe,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ZodSerializerInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ActivityLogInterceptor
        },
        {
            provide: APP_GUARD,
            useClass: CustomThrottlerGuard,
        },
        {
            provide: APP_GUARD,
            useClass: AccessTokenGuard,
        },
    ],
})
export class AppModule {}
