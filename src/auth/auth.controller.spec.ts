import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RegisterReqDto } from './auth.dto'
import { UnprocessableEntityException } from '@nestjs/common'
import { Role } from '@prisma/client'

describe('AuthController', () => {
    let controller: AuthController
    let authService: AuthService

    const mockAuthService = {
        register: jest.fn(),
        forgotPassword: jest.fn(),
        confirmResetOtp: jest.fn(),
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile()

        controller = module.get<AuthController>(AuthController)
        authService = module.get<AuthService>(AuthService)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    describe('register', () => {
        const validRegisterDto: RegisterReqDto = {
            fullName: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
            phone: '0123456789',
        }

        const expectedUserResult = {
            id: 1,
            fullName: 'Test User',
            email: 'test@example.com',
            phone: '0123456789',
            role: Role.student,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
        }

        it('should register a new user successfully', async () => {
            mockAuthService.register.mockResolvedValue(expectedUserResult)

            const result = await controller.register(validRegisterDto)

            expect(authService.register).toHaveBeenCalledWith(validRegisterDto)
            expect(authService.register).toHaveBeenCalledTimes(1)
            expect(result).toEqual(expectedUserResult)
        })

        it('should call authService.register with correct parameters', async () => {
            const registerDto: RegisterReqDto = {
                fullName: 'Another User',
                email: 'another@example.com',
                password: 'securepass',
                confirmPassword: 'securepass',
                phone: '0987654321',
            }

            mockAuthService.register.mockResolvedValue({
                ...expectedUserResult,
                id: 2,
                fullName: 'Another User',
                email: 'another@example.com',
                phone: '0987654321',
            })

            await controller.register(registerDto)

            expect(authService.register).toHaveBeenCalledWith(registerDto)
        })

        it('should return user without passwordHash', async () => {
            mockAuthService.register.mockResolvedValue(expectedUserResult)

            const result = await controller.register(validRegisterDto)

            expect(result).not.toHaveProperty('passwordHash')
            expect(result).toHaveProperty('id')
            expect(result).toHaveProperty('email')
            expect(result).toHaveProperty('fullName')
            expect(result).toHaveProperty('phone')
            expect(result).toHaveProperty('role')
        })

        it('should handle registration with different user data', async () => {
            const differentDto: RegisterReqDto = {
                fullName: 'John Doe',
                email: 'john.doe@test.com',
                password: 'strongPassword123',
                confirmPassword: 'strongPassword123',
                phone: '0912345678',
            }

            const expectedResult = {
                id: 3,
                fullName: 'John Doe',
                email: 'john.doe@test.com',
                phone: '0912345678',
                role: Role.student,
                createdAt: new Date('2025-01-02'),
                updatedAt: new Date('2025-01-02'),
            }

            mockAuthService.register.mockResolvedValue(expectedResult)

            const result = await controller.register(differentDto)

            expect(result).toEqual(expectedResult)
            expect(authService.register).toHaveBeenCalledWith(differentDto)
        })

        it('should throw UnprocessableEntityException when email already exists', async () => {
            mockAuthService.register.mockRejectedValue(new UnprocessableEntityException('Email đã được sử dụng'))

            await expect(controller.register(validRegisterDto)).rejects.toThrow(UnprocessableEntityException)
            await expect(controller.register(validRegisterDto)).rejects.toThrow('Email đã được sử dụng')
            expect(authService.register).toHaveBeenCalledWith(validRegisterDto)
        })

        it('should propagate errors from authService', async () => {
            const error = new Error('Database connection failed')
            mockAuthService.register.mockRejectedValue(error)

            await expect(controller.register(validRegisterDto)).rejects.toThrow(error)
            expect(authService.register).toHaveBeenCalledWith(validRegisterDto)
        })

        it('should handle registration with minimum valid password length', async () => {
            const minPasswordDto: RegisterReqDto = {
                fullName: 'Min Pass User',
                email: 'minpass@example.com',
                password: '123456', // minimum 6 characters
                confirmPassword: '123456',
                phone: '0123456789',
            }

            mockAuthService.register.mockResolvedValue({
                ...expectedUserResult,
                fullName: 'Min Pass User',
                email: 'minpass@example.com',
            })

            const result = await controller.register(minPasswordDto)

            expect(result).toBeDefined()
            expect(authService.register).toHaveBeenCalledWith(minPasswordDto)
        })

        it('should handle registration with long names and phone numbers', async () => {
            const longDataDto: RegisterReqDto = {
                fullName: 'Very Long Full Name That Is Still Valid',
                email: 'longname@example.com',
                password: 'password123',
                confirmPassword: 'password123',
                phone: '0123456789',
            }

            mockAuthService.register.mockResolvedValue({
                ...expectedUserResult,
                fullName: 'Very Long Full Name That Is Still Valid',
                email: 'longname@example.com',
            })

            const result = await controller.register(longDataDto)

            expect(result.fullName).toBe('Very Long Full Name That Is Still Valid')
            expect(authService.register).toHaveBeenCalledWith(longDataDto)
        })

        it('should ensure returned user has student role by default', async () => {
            mockAuthService.register.mockResolvedValue(expectedUserResult)

            const result = await controller.register(validRegisterDto)

            expect(result.role).toBe(Role.student)
        })

        it('should return user with timestamps', async () => {
            mockAuthService.register.mockResolvedValue(expectedUserResult)

            const result = await controller.register(validRegisterDto)

            expect(result).toHaveProperty('createdAt')
            expect(result).toHaveProperty('updatedAt')
            expect(result.createdAt).toBeInstanceOf(Date)
            expect(result.updatedAt).toBeInstanceOf(Date)
        })
    })

    describe('forgot-password (OTP)', () => {
        const validEmail = 'user@example.com'
        const successMessage = { message: 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi.' }

        it('should successfully process forgot password request', async () => {
            mockAuthService.forgotPassword.mockResolvedValue(successMessage)

            const result = await controller.forgotPassword({ email: validEmail })

            expect(authService.forgotPassword).toHaveBeenCalledWith({ email: validEmail })
            expect(result).toEqual(successMessage)
        })

        it('should handle invalid email format', async () => {
            const invalidEmail = 'invalid-email'
            mockAuthService.forgotPassword.mockRejectedValue(new UnprocessableEntityException('Email không hợp lệ'))

            await expect(controller.forgotPassword({ email: invalidEmail })).rejects.toThrow(
                UnprocessableEntityException,
            )
        })

        it('should return same message even if email does not exist', async () => {
            const nonExistentEmail = 'nonexistent@example.com'
            mockAuthService.forgotPassword.mockResolvedValue(successMessage)

            const result = await controller.forgotPassword({ email: nonExistentEmail })

            expect(result).toEqual(successMessage)
            expect(authService.forgotPassword).toHaveBeenCalledWith({ email: nonExistentEmail })
        })

        it('should handle service errors gracefully', async () => {
            const error = new Error('Service unavailable')
            mockAuthService.forgotPassword.mockRejectedValue(error)

            await expect(controller.forgotPassword({ email: validEmail })).rejects.toThrow(error)
        })
    })

    describe('reset-password', () => {
        const validResetData = {
            email: 'user@example.com',
            code: '123456',
            newPassword: 'NewP@ss123',
            confirmPassword: 'NewP@ss123',
        }
        const successMessage = { message: 'Đổi mật khẩu thành công' }

        it('should successfully reset password with valid data', async () => {
            mockAuthService.confirmResetOtp.mockResolvedValue(successMessage)

            const result = await controller.confirmResetOtp(validResetData)

            expect(authService.confirmResetOtp).toHaveBeenCalledWith(validResetData)
            expect(result).toEqual(successMessage)
        })

        it('should throw error when OTP code is invalid', async () => {
            const invalidOtpData = { ...validResetData, code: '000000' }
            mockAuthService.confirmResetOtp.mockRejectedValue(
                new UnprocessableEntityException('Mã OTP không hợp lệ hoặc đã hết hạn'),
            )

            await expect(controller.confirmResetOtp(invalidOtpData)).rejects.toThrow(UnprocessableEntityException)
        })

        it('should throw error when passwords do not match', async () => {
            const mismatchedPasswords = {
                ...validResetData,
                confirmPassword: 'DifferentP@ss123',
            }
            mockAuthService.confirmResetOtp.mockRejectedValue(
                new UnprocessableEntityException('Mật khẩu xác nhận không khớp'),
            )

            await expect(controller.confirmResetOtp(mismatchedPasswords)).rejects.toThrow(UnprocessableEntityException)
        })

        it('should throw error when new password is too weak', async () => {
            const weakPasswordData = {
                ...validResetData,
                newPassword: '123',
                confirmPassword: '123',
            }
            mockAuthService.confirmResetOtp.mockRejectedValue(
                new UnprocessableEntityException('Mật khẩu phải có ít nhất 6 ký tự'),
            )

            await expect(controller.confirmResetOtp(weakPasswordData)).rejects.toThrow(UnprocessableEntityException)
        })

        it('should throw error when email is invalid', async () => {
            const invalidEmailData = {
                ...validResetData,
                email: 'invalid-email',
            }
            mockAuthService.confirmResetOtp.mockRejectedValue(new UnprocessableEntityException('Email không hợp lệ'))

            await expect(controller.confirmResetOtp(invalidEmailData)).rejects.toThrow(UnprocessableEntityException)
        })

        it('should handle expired OTP code', async () => {
            mockAuthService.confirmResetOtp.mockRejectedValue(new UnprocessableEntityException('Mã OTP đã hết hạn'))

            await expect(controller.confirmResetOtp(validResetData)).rejects.toThrow(UnprocessableEntityException)
        })

        it('should handle service errors during reset', async () => {
            const error = new Error('Service unavailable')
            mockAuthService.confirmResetOtp.mockRejectedValue(error)

            await expect(controller.confirmResetOtp(validResetData)).rejects.toThrow(error)
        })
    })
})
