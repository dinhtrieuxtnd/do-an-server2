import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Bắt đầu seed database...')

    // Lấy thông tin admin từ biến môi trường
    const adminEmail = process.env.ADMIN_EMAIL || 'superAdmin@tutorcenter.com'
    const adminPassword = process.env.ADMIN_PASSWORD || '12345678'
    const adminFullName = process.env.ADMIN_FULL_NAME || 'Root Admin'
    const adminPhoneNumber = process.env.ADMIN_PHONE_NUMBER || '0123456789'

    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    })

    if (existingAdmin) {
        console.log('✅ Admin đã tồn tại:', existingAdmin.email)
        return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    // Tạo admin user
    const admin = await prisma.user.create({
        data: {
            email: adminEmail,
            password: hashedPassword,
            phoneNumber: adminPhoneNumber,
            role: Role.ADMIN,
            profile: {
                create: {
                    fullName: adminFullName,
                    dateOfBirth: new Date('1990-01-01'),
                },
            },
        },
        include: {
            profile: true,
        },
    })

    console.log('✅ Đã tạo admin user thành công!')
    console.log('📧 Email:', admin.email)
    console.log('👤 Tên:', admin.profile?.fullName)
    console.log('🔑 Role:', admin.role)
    console.log('📱 Số điện thoại:', admin.phoneNumber)
}

main()
    .catch((error) => {
        console.error('❌ Lỗi khi seed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
