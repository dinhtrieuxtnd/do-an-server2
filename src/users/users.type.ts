import z from 'zod'
import { ChangePasswordReqSchema } from './users.model'

export type ChangePasswordReqType = z.infer<typeof ChangePasswordReqSchema>
