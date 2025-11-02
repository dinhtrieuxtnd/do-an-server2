import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { SharedModule } from 'src/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [UsersController],
  providers: [UsersService],
  
})

export class UsersModule {}
