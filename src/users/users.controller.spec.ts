import { Test, TestingModule } from '@nestjs/testing'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

describe('UsersController - changePassword', () => {
  let controller: UsersController
  let usersService: UsersService

  const mockUsersService = {
    changePassword: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile()

    controller = module.get<UsersController>(UsersController)
    usersService = module.get<UsersService>(UsersService)

    jest.clearAllMocks()
  })

  it('calls service.changePassword and returns its result', async () => {
    mockUsersService.changePassword.mockResolvedValue({ message: 'Đổi mật khẩu thành công' })

    const body = {
      email: 'u@x.com',
      currentPassword: 'old',
      newPassword: 'new123456',
      confirmPassword: 'new123456',
    } as any

    const res = await controller.changePassword(body)
    expect(usersService.changePassword).toHaveBeenCalledWith(body)
    expect(res).toEqual({ message: 'Đổi mật khẩu thành công' })
  })
})
