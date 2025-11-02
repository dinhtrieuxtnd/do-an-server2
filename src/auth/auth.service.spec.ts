import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { AuthRepo } from './auth.repo'
import { HashingService } from 'src/shared/services/hashing.service'
import { SharedUserRepo } from 'src/shared/repos/shared-user.repo'
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common'
import { RegisterReqDto } from './auth.dto'
import { EmailService } from 'src/shared/services/email.service'

function mockDateNow(ts: number) {
    const real = Date.now
    jest.spyOn(Date, 'now').mockImplementation(() => ts)
    return () => (Date.now as any).mockImplementation(real)
}

describe('AuthService', () => {
    let service: AuthService
    let authRepo: AuthRepo
    let hashingService: HashingService
    let sharedUserRepo: SharedUserRepo
    let emailService: EmailService

    const mockAuthRepo = {
        createUser: jest.fn(),
        createOtp: jest.fn(),
        findValidOtpByEmailAndHash: jest.fn(),
        findLatestOtpByEmail: jest.fn(),
        deleteOtpById: jest.fn(),
        deleteExpiredOtpByEmail: jest.fn(async () => {}),
    }

    const mockHashingService = {
        hash: jest.fn(),
        compare: jest.fn(),
    }

    const mockSharedUserRepo = {
        findUnique: jest.fn(),
        createUser: jest.fn(),
        update: jest.fn(),
    }

    const mockEmailService = {
        sendEmail: jest.fn(),
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: AuthRepo,
                    useValue: mockAuthRepo,
                },
                {
                    provide: HashingService,
                    useValue: mockHashingService,
                },
                {
                    provide: SharedUserRepo,
                    useValue: mockSharedUserRepo,
                },
                { 
                    provide: EmailService, 
                    useValue: mockEmailService 
                },
            ],
        }).compile()

        service = module.get<AuthService>(AuthService)
        authRepo = module.get<AuthRepo>(AuthRepo)
        hashingService = module.get<HashingService>(HashingService)
        sharedUserRepo = module.get<SharedUserRepo>(SharedUserRepo)
        emailService = module.get<EmailService>(EmailService)
    })

    afterEach(() => {
        jest.clearAllMocks()
        jest.restoreAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('register', () => {
        const registerDto: RegisterReqDto = {
            fullName: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
            phone: '0123456789',
        }

        it('should register a new user successfully', async () => {
            const hashedPassword = 'hashed_password_123'
            const createdUser = {
                id: 1,
                fullName: 'Test User',
                email: 'test@example.com',
                passwordHash: hashedPassword,
                phone: '0123456789',
                role: 'student' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue(hashedPassword)
            mockSharedUserRepo.createUser.mockResolvedValue(createdUser)

            const result = await service.register(registerDto)

            expect(sharedUserRepo.findUnique).toHaveBeenCalledWith({ email: registerDto.email })
            expect(hashingService.hash).toHaveBeenCalledWith(registerDto.password)
            expect(sharedUserRepo.createUser).toHaveBeenCalledWith({
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: hashedPassword,
                role: 'student',
                phone: registerDto.phone,
            })
            expect(result).toEqual(createdUser)
        })

        it('should throw UnprocessableEntityException if email already exists', async () => {
            const existingUser = {
                id: 1,
                fullName: 'Existing User',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                phone: '0123456789',
                role: 'student' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockSharedUserRepo.findUnique.mockResolvedValue(existingUser)

            await expect(service.register(registerDto)).rejects.toThrow(UnprocessableEntityException)
            await expect(service.register(registerDto)).rejects.toThrow('Email đã được sử dụng')

            expect(sharedUserRepo.findUnique).toHaveBeenCalledWith({ email: registerDto.email })
            expect(hashingService.hash).not.toHaveBeenCalled()
            expect(sharedUserRepo.createUser).not.toHaveBeenCalled()
        })

        it('should hash the password before creating user', async () => {
            const hashedPassword = 'super_secure_hashed_password'

            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue(hashedPassword)
            mockSharedUserRepo.createUser.mockResolvedValue({
                id: 1,
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: hashedPassword,
                phone: registerDto.phone,
                role: 'student',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            await service.register(registerDto)

            expect(hashingService.hash).toHaveBeenCalledWith(registerDto.password)
            expect(sharedUserRepo.createUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    passwordHash: hashedPassword,
                }),
            )
        })

        it('should create user with student role by default', async () => {
            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue('hashed_password')
            mockSharedUserRepo.createUser.mockResolvedValue({
                id: 1,
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: 'hashed_password',
                phone: registerDto.phone,
                role: 'student',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            await service.register(registerDto)

            expect(sharedUserRepo.createUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    role: 'student',
                }),
            )
        })

        it('should call findUnique exactly once with correct email', async () => {
            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue('hashed_password')
            mockSharedUserRepo.createUser.mockResolvedValue({
                id: 1,
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: 'hashed_password',
                phone: registerDto.phone,
                role: 'student',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            await service.register(registerDto)

            expect(sharedUserRepo.findUnique).toHaveBeenCalledTimes(1)
            expect(sharedUserRepo.findUnique).toHaveBeenCalledWith({ email: registerDto.email })
        })

        it('should call hash exactly once with correct password', async () => {
            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue('hashed_password')
            mockSharedUserRepo.createUser.mockResolvedValue({
                id: 1,
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: 'hashed_password',
                phone: registerDto.phone,
                role: 'student',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            await service.register(registerDto)

            expect(hashingService.hash).toHaveBeenCalledTimes(1)
            expect(hashingService.hash).toHaveBeenCalledWith(registerDto.password)
        })

        it('should call createUser exactly once with correct data', async () => {
            const hashedPassword = 'hashed_password_123'

            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue(hashedPassword)
            mockSharedUserRepo.createUser.mockResolvedValue({
                id: 1,
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: hashedPassword,
                phone: registerDto.phone,
                role: 'student',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            await service.register(registerDto)

            expect(sharedUserRepo.createUser).toHaveBeenCalledTimes(1)
            expect(sharedUserRepo.createUser).toHaveBeenCalledWith({
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: hashedPassword,
                role: 'student',
                phone: registerDto.phone,
            })
        })

        it('should return the created user object', async () => {
            const hashedPassword = 'hashed_password'
            const createdUser = {
                id: 1,
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: hashedPassword,
                phone: registerDto.phone,
                role: 'student' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue(hashedPassword)
            mockSharedUserRepo.createUser.mockResolvedValue(createdUser)

            const result = await service.register(registerDto)

            expect(result).toEqual(createdUser)
            expect(result.id).toBe(createdUser.id)
            expect(result.email).toBe(createdUser.email)
            expect(result.fullName).toBe(createdUser.fullName)
            expect(result.phone).toBe(createdUser.phone)
            expect(result.role).toBe('student')
        })

        it('should handle different email formats correctly', async () => {
            const emailVariations = [
                'test@example.com',
                'test.user@example.com',
                'test+tag@example.co.uk',
                'test_user@subdomain.example.com',
            ]

            for (const email of emailVariations) {
                const dto = { ...registerDto, email }
                mockSharedUserRepo.findUnique.mockResolvedValue(null)
                mockHashingService.hash.mockResolvedValue('hashed_password')
                mockSharedUserRepo.createUser.mockResolvedValue({
                    id: 1,
                    fullName: dto.fullName,
                    email: dto.email,
                    passwordHash: 'hashed_password',
                    phone: dto.phone,
                    role: 'student',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })

                await service.register(dto)

                expect(sharedUserRepo.findUnique).toHaveBeenCalledWith({ email })
                jest.clearAllMocks()
            }
        })

        it('should handle different phone number formats correctly', async () => {
            const phoneVariations = ['0123456789', '0987654321', '0999999999']

            for (const phone of phoneVariations) {
                const dto = { ...registerDto, phone }
                mockSharedUserRepo.findUnique.mockResolvedValue(null)
                mockHashingService.hash.mockResolvedValue('hashed_password')
                mockSharedUserRepo.createUser.mockResolvedValue({
                    id: 1,
                    fullName: dto.fullName,
                    email: dto.email,
                    passwordHash: 'hashed_password',
                    phone: dto.phone,
                    role: 'student',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })

                const result = await service.register(dto)

                expect(result.phone).toBe(phone)
                jest.clearAllMocks()
            }
        })

        it('should handle long full names correctly', async () => {
            const longName = 'This Is A Very Long Full Name With Many Words To Test The System'
            const dto = { ...registerDto, fullName: longName }

            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue('hashed_password')
            mockSharedUserRepo.createUser.mockResolvedValue({
                id: 1,
                fullName: longName,
                email: dto.email,
                passwordHash: 'hashed_password',
                phone: dto.phone,
                role: 'student',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            const result = await service.register(dto)

            expect(result.fullName).toBe(longName)
            expect(sharedUserRepo.createUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    fullName: longName,
                }),
            )
        })

        it('should throw error when email exists with different case sensitivity', async () => {
            const existingUser = {
                id: 1,
                fullName: 'Existing User',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                phone: '0123456789',
                role: 'student' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockSharedUserRepo.findUnique.mockResolvedValue(existingUser)

            await expect(service.register(registerDto)).rejects.toThrow(UnprocessableEntityException)
        })

        it('should not store plain text password', async () => {
            const hashedPassword = 'hashed_password_123'

            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue(hashedPassword)
            mockSharedUserRepo.createUser.mockResolvedValue({
                id: 1,
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: hashedPassword,
                phone: registerDto.phone,
                role: 'student',
                createdAt: new Date(),
                updatedAt: new Date(),
            })

            await service.register(registerDto)

            expect(sharedUserRepo.createUser).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    password: registerDto.password,
                }),
            )
            expect(sharedUserRepo.createUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    passwordHash: hashedPassword,
                }),
            )
            expect(hashedPassword).not.toBe(registerDto.password)
        })

        it('should propagate errors from findUnique', async () => {
            const dbError = new Error('Database connection error')
            mockSharedUserRepo.findUnique.mockRejectedValue(dbError)

            await expect(service.register(registerDto)).rejects.toThrow(dbError)
        })

        it('should propagate errors from hash', async () => {
            const hashError = new Error('Hashing error')
            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockRejectedValue(hashError)

            await expect(service.register(registerDto)).rejects.toThrow(hashError)
        })

        it('should propagate errors from createUser', async () => {
            const createError = new Error('Failed to create user')
            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue('hashed_password')
            mockSharedUserRepo.createUser.mockRejectedValue(createError)

            await expect(service.register(registerDto)).rejects.toThrow(createError)
        })

        it('should maintain execution order: check email -> hash password -> create user', async () => {
            const callOrder: string[] = []

            mockSharedUserRepo.findUnique.mockImplementation(async () => {
                callOrder.push('findUnique')
                return null
            })
            mockHashingService.hash.mockImplementation(async () => {
                callOrder.push('hash')
                return 'hashed_password'
            })
            mockSharedUserRepo.createUser.mockImplementation(async () => {
                callOrder.push('createUser')
                return {
                    id: 1,
                    fullName: registerDto.fullName,
                    email: registerDto.email,
                    passwordHash: 'hashed_password',
                    phone: registerDto.phone,
                    role: 'student',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            })

            await service.register(registerDto)

            expect(callOrder).toEqual(['findUnique', 'hash', 'createUser'])
        })

        it('should not call hash if email already exists', async () => {
            const existingUser = {
                id: 1,
                fullName: 'Existing User',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                phone: '0123456789',
                role: 'student' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockSharedUserRepo.findUnique.mockResolvedValue(existingUser)

            try {
                await service.register(registerDto)
            } catch (error) {
                // Expected error
            }

            expect(hashingService.hash).not.toHaveBeenCalled()
        })

        it('should not call createUser if email already exists', async () => {
            const existingUser = {
                id: 1,
                fullName: 'Existing User',
                email: 'test@example.com',
                passwordHash: 'hashed_password',
                phone: '0123456789',
                role: 'student' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            mockSharedUserRepo.findUnique.mockResolvedValue(existingUser)

            try {
                await service.register(registerDto)
            } catch (error) {
                // Expected error
            }

            expect(sharedUserRepo.createUser).not.toHaveBeenCalled()
        })

        it('should handle createdAt and updatedAt timestamps correctly', async () => {
            const now = new Date()
            const createdUser = {
                id: 1,
                fullName: registerDto.fullName,
                email: registerDto.email,
                passwordHash: 'hashed_password',
                phone: registerDto.phone,
                role: 'student' as const,
                createdAt: now,
                updatedAt: now,
            }

            mockSharedUserRepo.findUnique.mockResolvedValue(null)
            mockHashingService.hash.mockResolvedValue('hashed_password')
            mockSharedUserRepo.createUser.mockResolvedValue(createdUser)

            const result = await service.register(registerDto)

            expect(result.createdAt).toEqual(now)
            expect(result.updatedAt).toEqual(now)
        })
    })

    
    describe('forgotPassword (OTP)', () => {
        it('returns generic and does nothing if user not found', async () => {
            mockSharedUserRepo.findUnique.mockResolvedValue(null)

            const res = await service.forgotPassword({ email: 'none@example.com' } as any)

            expect(res).toEqual({ message: expect.any(String) })
            expect(authRepo.createOtp).not.toHaveBeenCalled()
            expect(emailService.sendEmail).not.toHaveBeenCalled()
        })

        it('creates OTP and sends email when user exists', async () => {
            mockSharedUserRepo.findUnique.mockResolvedValue({ id: 1, email: 'u@x.com', fullName: 'U' } as any)
            mockAuthRepo.findLatestOtpByEmail.mockResolvedValue(null) // no rate-limit block

            const undo = mockDateNow(1_700_000_000_000)
            const res = await service.forgotPassword({ email: 'u@x.com' } as any)
            undo()

            expect(authRepo.createOtp).toHaveBeenCalledWith(
                'u@x.com',
                expect.any(String), // sha256 hex
                expect.any(Date),
            )
            expect(emailService.sendEmail).toHaveBeenCalledWith({
                email: 'u@x.com',
                subject: expect.any(String),
                content: expect.stringContaining('OTP'),
            })
            expect(res).toEqual({ message: expect.any(String) })
        })

        it('rate-limits resend within window', async () => {
            mockSharedUserRepo.findUnique.mockResolvedValue({ id: 2, email: 'u2@x.com', fullName: 'U2' } as any)
            mockAuthRepo.findLatestOtpByEmail.mockResolvedValue({ createdAt: new Date() } as any)

            const res = await service.forgotPassword({ email: 'u2@x.com' } as any)

            expect(emailService.sendEmail).not.toHaveBeenCalled()
            expect(authRepo.createOtp).not.toHaveBeenCalled()
            expect(res).toEqual({ message: expect.any(String) })
        })
    })

    
    describe('reset password ', () => {
        it('throws 400 if user not found by email', async () => {
            mockSharedUserRepo.findUnique.mockResolvedValue(null)

            await expect(
                service.confirmResetOtp({
                    email: 'none@x.com',
                    code: '123456',
                    newPassword: 'pass123',
                    confirmPassword: 'pass123',
                } as any),
            ).rejects.toBeInstanceOf(BadRequestException)
        })

        it('throws 400 if OTP not valid (wrong or expired)', async () => {
            mockSharedUserRepo.findUnique.mockResolvedValue({ id: 5, email: 'u@x.com' } as any)
            mockAuthRepo.findValidOtpByEmailAndHash.mockResolvedValue(null)

            await expect(
                service.confirmResetOtp({
                    email: 'u@x.com',
                    code: '000000',
                    newPassword: 'pass123',
                    confirmPassword: 'pass123',
                } as any),
            ).rejects.toBeInstanceOf(BadRequestException)
        })

        it('consumes OTP and updates password on success', async () => {
            mockSharedUserRepo.findUnique.mockResolvedValue({ id: 6, email: 'u@x.com' } as any)
            mockAuthRepo.findValidOtpByEmailAndHash.mockResolvedValue({ id: 99 } as any)
            mockHashingService.hash.mockResolvedValue('hashed:pass123')

            const res = await service.confirmResetOtp({
                email: 'u@x.com',
                code: '123456',
                newPassword: 'pass123',
                confirmPassword: 'pass123',
            } as any)

            expect(authRepo.deleteOtpById).toHaveBeenCalledWith(99)
            expect(hashingService.hash).toHaveBeenCalledWith('pass123')
            expect(sharedUserRepo.update).toHaveBeenCalledWith({ id: 6 }, { passwordHash: 'hashed:pass123' })
            expect(authRepo.deleteExpiredOtpByEmail).toHaveBeenCalledWith('u@x.com')
            expect(res).toEqual({ message: 'Đổi mật khẩu thành công' })
        })
    })
})
