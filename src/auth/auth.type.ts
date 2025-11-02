import z from 'zod'
import { RegisterReqSchema, ForgotPasswordReqSchema, ConfirmResetOtpReqSchema } from './auth.model'
import { UserSchema } from 'src/shared/models/user.model'

export type AuthType = z.infer<typeof UserSchema>
export type RegisterReqType = z.infer<typeof RegisterReqSchema>
export type ForgotPasswordReqType = z.infer<typeof ForgotPasswordReqSchema>
export type ConfirmResetOtpReqType = z.infer<typeof ConfirmResetOtpReqSchema>
