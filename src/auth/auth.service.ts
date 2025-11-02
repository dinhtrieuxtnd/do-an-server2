import { BadRequestException, Injectable, UnprocessableEntityException, NotFoundException } from '@nestjs/common'
import { AuthRepo } from './auth.repo'
import { HashingService } from 'src/shared/services/hashing.service'
import { SharedUserRepo } from 'src/shared/repos/shared-user.repo'
import { AuthType, RegisterReqType, ForgotPasswordReqType, ConfirmResetOtpReqType } from './auth.type'
import { Role } from '@prisma/client'
import * as crypto from 'crypto'
import { EmailService } from 'src/shared/services/email.service'

const OTP_EXPIRES_MIN = 10
const OTP_RESEND_WINDOW_SEC = 60

function randomOtp6(): string {
    return Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, '0')
}

function sha256Hex(s: string): string {
    return crypto.createHash('sha256').update(s).digest('hex')
}

@Injectable()
export class AuthService {
    [x: string]: any
    constructor(
        private readonly authRepo: AuthRepo,
        private readonly hashingService: HashingService,
        private readonly sharedUserRepo: SharedUserRepo,
        private readonly emailService: EmailService,
    ) {}

    async register(body: RegisterReqType): Promise<AuthType> {
        const user = await this.sharedUserRepo.findUnique({ email: body.email })
        if (user) {
            throw new UnprocessableEntityException('Email đã được sử dụng')
        }
        const hashedPassword = await this.hashingService.hash(body.password)
        const newUser = await this.sharedUserRepo.createUser({
            fullName: body.fullName,
            email: body.email,
            passwordHash: hashedPassword,
            role: Role.student,
            phone: body.phone,
        })
        return newUser
    }

    async forgotPassword(body: ForgotPasswordReqType): Promise<{ message: string }> {
        const generic = { message: 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi.' }
        const user = await this.sharedUserRepo.findUnique({ email: body.email })
        if (!user) return generic

        // chặn spam gửi liên tiếp
        const latest = await this.authRepo.findLatestOtpByEmail(body.email)
        if (latest) {
            const diffSec = (Date.now() - new Date(latest.createdAt).getTime()) / 1000
            if (diffSec < OTP_RESEND_WINDOW_SEC) {
                return generic
            }
        }

        const otp = randomOtp6()
        const otpHash = sha256Hex(otp)
        const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000)

        await this.authRepo.createOtp(body.email, otpHash, expiresAt)

        if (process.env.NODE_ENV !== 'production') {
            console.log('[DEBUG] OTP for', body.email, '->', otp)
        }

        await this.emailService.sendEmail({
            email: body.email,
            subject: 'Mã OTP đặt lại mật khẩu',
            content: `Xin chào ${user.fullName},<br/>
        Mã OTP để đặt lại mật khẩu của bạn là: <b>${otp}</b>.<br/>
        Mã sẽ hết hạn sau ${OTP_EXPIRES_MIN} phút.<br/>
        Nếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
        })

        return generic
    }

    async confirmResetOtp(body: ConfirmResetOtpReqType): Promise<{ message: string }> {
       
        const normEmail = body.email.trim().toLowerCase()
        const user = await this.sharedUserRepo.findUnique({ email: normEmail })
        if (!user) {
            throw new BadRequestException('Mã OTP không đúng hoặc đã hết hạn')
        }

         // 3) Kiểm tra OTP hợp lệ
        const otpHash = sha256Hex(body.code)
        const rec = await this.authRepo.findValidOtpByEmailAndHash(normEmail, otpHash)
        if (!rec) {
            throw new BadRequestException('Mã OTP không đúng hoặc đã hết hạn')
        }

        await this.authRepo.deleteOtpById(rec.id)
      
        const newHash = await this.hashingService.hash(body.newPassword)
        await this.sharedUserRepo.update({ id: user.id }, { passwordHash: newHash })
        
        await this.authRepo.deleteExpiredOtpByEmail(body.email).catch(() => {})

        return { message: 'Đổi mật khẩu thành công' }
    }
}
