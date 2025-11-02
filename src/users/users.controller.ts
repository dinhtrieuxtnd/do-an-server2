import { Body, Controller, Put } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { UsersService } from './users.service'
import { ChangePasswordReqDto, ChangePasswordResDto } from './users.dto'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Put('change-password')
  @ZodSerializerDto(ChangePasswordResDto)
  async changePassword(@Body() body: ChangePasswordReqDto) {
    return this.usersService.changePassword(body)
  }
}
