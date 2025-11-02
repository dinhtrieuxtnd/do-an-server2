import { Body, Controller, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { ConfirmResetOtpReqDto, ConfirmResetOtpResDto, ForgotPasswordReqDto, ForgotPasswordResDto, RegisterReqDto, RegisterResDto } from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ZodSerializerDto(RegisterResDto)
    async register(@Body() body: RegisterReqDto) {
        return this.authService.register(body)
    }

    @Post('forgot-password')
    @ZodSerializerDto(ForgotPasswordResDto)
    async forgotPassword(@Body() body: ForgotPasswordReqDto) {
        return this.authService.forgotPassword(body)
    }

    @Post('reset-password')
    @ZodSerializerDto(ConfirmResetOtpResDto)
    async confirmResetOtp(@Body() body: ConfirmResetOtpReqDto) {
        return this.authService.confirmResetOtp(body)
    }
}
