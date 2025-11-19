import { Global, Module } from '@nestjs/common'
import { PrismaService } from './services/prisma.service'
import { SharedUserRepo } from './repos/shared-user.repo'
import { TokenService } from './services/token.service'
import { JwtModule } from '@nestjs/jwt'
import { HashingService } from './services/hashing.service'
import { EmailService } from './services/email.service'
import { MinioService } from './services/minio.service'
import { ClassroomRepo } from 'src/routes/classroom/repos/classroom.repo'
import { SharedClassroomRepo } from './repos/shared-classroom.repo'
import { SharedClrStdRepo } from './repos/shared-clrstd.repo'
import { SharedJreqRepo } from './repos/shared-join-req.repo'
import { SharedMediaRepo } from './repos/shared-media.repo'
import { SharedLessonRepo } from './repos/shared-lesson.repo'
import { ActivityLogService } from './services/activity-log.service'

const sharedServices = [
    PrismaService,
    SharedUserRepo,
    TokenService,
    HashingService,
    EmailService,
    MinioService,
    ClassroomRepo,
    SharedClassroomRepo,
    SharedJreqRepo,
    SharedClrStdRepo,
    SharedMediaRepo,
    SharedLessonRepo,
    
]

@Global()
@Module({
    imports: [JwtModule],
    providers: [...sharedServices,
        {
            provide: 'IActivityLogService',
            useClass: ActivityLogService,
        }
    ],
    exports: [...sharedServices, 'IActivityLogService'],
})
export class SharedModule {}
