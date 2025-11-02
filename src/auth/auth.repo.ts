import { Injectable } from '@nestjs/common'
import { User } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class AuthRepo {
    constructor(private readonly prismaService: PrismaService) {}

    async createUser(data: {
        fullName: string
        email: string
        passwordHash: string
        role: 'student' | 'admin'
        phone?: string
    }): Promise<User> {
        const user = await this.prismaService.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                passwordHash: data.passwordHash,
                role: data.role,
                phone: data.phone || '',
            },
        })
        return user
    }

    createOtp(email: string, otpHash: string, expiresAt: Date) {
        return this.prismaService.otpRecord.create({
            data: { email, OtpCode: otpHash, expiresAt },
        })
    }

    findValidOtpByEmailAndHash(email: string, otpHash: string) {
        const now = new Date()
        return this.prismaService.otpRecord.findFirst({
            where: {
                email,
                OtpCode: otpHash,
                expiresAt: { gt: now },
            },
            orderBy: { createdAt: 'desc' },
        })
    }

    findLatestOtpByEmail(email: string) {
        return this.prismaService.otpRecord.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' },
        })
    }

    deleteOtpById(id: bigint | number) {
        return this.prismaService.otpRecord.delete({
            where: { id: typeof id === 'bigint' ? Number(id) : id },
        })
    }

    deleteExpiredOtpByEmail(email: string) {
        const now = new Date()
        return this.prismaService.otpRecord.deleteMany({
            where: { email, expiresAt: { lte: now } },
        })
    }
}
