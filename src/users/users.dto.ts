import { createZodDto } from 'nestjs-zod'
import { ChangePasswordReqSchema, ChangePasswordResSchema } from './users.model'

export class ChangePasswordReqDto extends createZodDto(ChangePasswordReqSchema) {}
export class ChangePasswordResDto extends createZodDto(ChangePasswordResSchema) {}

