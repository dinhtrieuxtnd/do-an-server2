import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SharedModule } from './shared/shared.module'
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ZodSerializerInterceptor } from 'nestjs-zod'
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module';
import CustomZodValidationPipe from './shared/pipes/custom-zod-validation.pipe'

@Module({
    imports: [SharedModule, AuthModule, UsersModule],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_INTERCEPTOR,
            useClass: ZodSerializerInterceptor,
        },
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
        {
            provide: APP_PIPE,
            useClass: CustomZodValidationPipe,
        }
    ],
})
export class AppModule {}
