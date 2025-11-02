import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { HashingService } from 'src/shared/services/hashing.service'
import { SharedUserRepo } from 'src/shared/repos/shared-user.repo'
import { ChangePasswordReqType } from './users.type'

@Injectable()
export class UsersService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly sharedUserRepo: SharedUserRepo,
  ) {}

  async changePassword(body: ChangePasswordReqType): Promise<{ message: string }> {
    // 1) Chuẩn hoá email
    const email = body.email.trim().toLowerCase()

    // 2) Tìm user
    const user = await this.sharedUserRepo.findUnique({ email })
    if (!user) {
        throw new NotFoundException('Người dùng không tồn tại')
    }

    // 3) So sánh mật khẩu hiện tại
    const ok = await this.hashingService.compare(body.currentPassword, user.passwordHash)
    if (!ok) {
        throw new BadRequestException('Mật khẩu hiện tại không đúng')
    }

    const newHash = await this.hashingService.hash(body.newPassword)
    await this.sharedUserRepo.update({ id: user.id }, { passwordHash: newHash })

    return { message: 'Đổi mật khẩu thành công' }
  }
}
