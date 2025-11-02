import z from 'zod'
import { UserSchema } from 'src/shared/models/user.model'

export const RegisterReqSchema = UserSchema.pick({
    email: true,
    fullName: true,
    phone: true,
})
    .extend({
        password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
        confirmPassword: z.string().min(6, 'Mật khẩu xác nhận phải có ít nhất 6 ký tự'),
    })
    .strict()
    .superRefine(({ confirmPassword, password }, ctx) => {
        if (confirmPassword !== password) {
            ctx.addIssue({
                code: 'custom',
                message: 'Mật khẩu xác nhận không khớp',
                path: ['confirmPassword'],
            })
        }
    })

export const RegisterResSchema = UserSchema.omit({
    passwordHash: true,
})

export const ForgotPasswordReqSchema = z
    .object({
        email: z.string().email('Email không hợp lệ'),
    })
    .strict()

export const ForgotPasswordResSchema = z
    .object({
        message: z.string(),
    })
    .strict()

export const ConfirmResetOtpReqSchema = z
    .object({
        email: z.string().email('Email không hợp lệ'),
        code: z.string().regex(/^\d{6}$/, 'Mã OTP phải gồm 6 chữ số'),
        newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
        confirmPassword: z.string().min(6, 'Mật khẩu xác nhận phải có ít nhất 6 ký tự'),
    })
    .strict()
    .superRefine(({ newPassword, confirmPassword }, ctx) => {
        if (newPassword !== confirmPassword) {
            ctx.addIssue({
                code: 'custom',
                path: ['confirmPassword'],
                message: 'Mật khẩu xác nhận không khớp',
            })
        }
    })
export const ConfirmResetOtpResSchema = z
    .object({
        message: z.string(),
    })
    .strict()
