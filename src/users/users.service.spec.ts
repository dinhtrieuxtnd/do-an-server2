import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from './users.service'
import { HashingService } from 'src/shared/services/hashing.service'
import { SharedUserRepo } from 'src/shared/repos/shared-user.repo'
import { BadRequestException, NotFoundException } from '@nestjs/common'

describe('UsersService - changePassword', () => {
  let service: UsersService
  let hashingService: HashingService
  let sharedUserRepo: SharedUserRepo

  const mockHashingService = {
    hash: jest.fn(),
    compare: jest.fn(),
  }

  const mockSharedUserRepo = {
    findUnique: jest.fn(),
    update: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: HashingService, useValue: mockHashingService },
        { provide: SharedUserRepo, useValue: mockSharedUserRepo },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    hashingService = module.get<HashingService>(HashingService)
    sharedUserRepo = module.get<SharedUserRepo>(SharedUserRepo)

    jest.clearAllMocks()
  })

  it('throws NotFoundException when user not found', async () => {
    mockSharedUserRepo.findUnique.mockResolvedValue(null)

    await expect(service.changePassword({
      email: 'no@user.com',
      currentPassword: 'old123',
      newPassword: 'new123456',
      confirmPassword: 'new123456',
    } as any)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('throws BadRequestException when current password is wrong', async () => {
    mockSharedUserRepo.findUnique.mockResolvedValue({ id: 1, passwordHash: 'hash:old' })
    mockHashingService.compare.mockResolvedValue(false)

    await expect(service.changePassword({
      email: 'u@x.com',
      currentPassword: 'wrong',
      newPassword: 'new123456',
      confirmPassword: 'new123456',
    } as any)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('updates password when current password is correct', async () => {
    mockSharedUserRepo.findUnique.mockResolvedValue({ id: 7, passwordHash: 'hash:old' })
    mockHashingService.compare.mockResolvedValue(true)
    mockHashingService.hash.mockResolvedValue('hash:new')
    mockSharedUserRepo.update.mockResolvedValue({ id: 7 })

    const res = await service.changePassword({
      email: 'u@x.com',
      currentPassword: 'oldpass',
      newPassword: 'newpass123',
      confirmPassword: 'newpass123',
    } as any)

    
    expect(hashingService.compare).toHaveBeenCalledWith('oldpass', 'hash:old')
    expect(hashingService.hash).toHaveBeenCalledWith('newpass123')
    expect(sharedUserRepo.update).toHaveBeenCalledWith({ id: 7 }, { passwordHash: 'hash:new' })
    expect(res).toEqual({ message: 'Đổi mật khẩu thành công' })
  })
})
