import { createZodDto } from 'nestjs-zod'
import {
    RegisterReqSchema,
    RegisterResSchema,
    ForgotPasswordReqSchema,
    ForgotPasswordResSchema,
    ConfirmResetOtpReqSchema,
    ConfirmResetOtpResSchema,
} from './auth.model'

export class RegisterReqDto extends createZodDto(RegisterReqSchema) {}
export class RegisterResDto extends createZodDto(RegisterResSchema) {}

export class ForgotPasswordReqDto extends createZodDto(ForgotPasswordReqSchema) {}
export class ForgotPasswordResDto extends createZodDto(ForgotPasswordResSchema) {}

export class ConfirmResetOtpReqDto extends createZodDto(ConfirmResetOtpReqSchema) {}
export class ConfirmResetOtpResDto extends createZodDto(ConfirmResetOtpResSchema) {}
