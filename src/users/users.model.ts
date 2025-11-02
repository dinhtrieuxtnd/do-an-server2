import z from 'zod'

export const ChangePasswordReqSchema = z
    .object({
        email: z.string().email('Email không hợp lệ').trim().transform(e => e.toLowerCase()),
        currentPassword: z.string().min(6, 'Mật khẩu hiện tại phải có ít nhất 6 ký tự'),
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

    
export const ChangePasswordResSchema = z
    .object({
        message: z.string(),
    })
    .strict()
