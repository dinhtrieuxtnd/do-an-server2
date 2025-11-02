import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthRepo } from './auth.repo'
import { SharedModule } from 'src/shared/shared.module'

@Module({
    imports: [SharedModule],
    controllers: [AuthController],
    providers: [AuthService, AuthRepo],
})
export class AuthModule {}
