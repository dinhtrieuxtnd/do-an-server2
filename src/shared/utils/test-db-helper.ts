import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';
import * as fs from 'fs';

export class TestDatabaseHelper {
    private static instance: PrismaClient | null = null;
    private static dbPath: string | null = null;

    /**
     * Tạo và khởi tạo in-memory SQLite database cho testing
     */
    static async setup(): Promise<PrismaClient> {
        // Tạo temporary file cho SQLite database
        const timestamp = Date.now();
        const dbPath = join(__dirname, '..', '..', '..', 'test', `test-${timestamp}.db`);
        this.dbPath = dbPath;

        // Ensure test directory exists
        const testDir = join(__dirname, '..', '..', '..', 'test');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Set DATABASE_URL to SQLite
        process.env.DATABASE_URL = `file:${dbPath}`;

        // Initialize Prisma Client
        this.instance = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
        });

        // Chạy migration để tạo schema
        try {
            execSync('npx prisma migrate deploy', {
                env: {
                    ...process.env,
                    DATABASE_URL: `file:${dbPath}`,
                },
                stdio: 'pipe',
            });
        } catch (error) {
            // Nếu không có migration, push schema trực tiếp
            execSync('npx prisma db push --skip-generate', {
                env: {
                    ...process.env,
                    DATABASE_URL: `file:${dbPath}`,
                },
                stdio: 'pipe',
            });
        }

        await this.instance.$connect();

        return this.instance;
    }

    /**
     * Lấy instance của Prisma Client
     */
    static getInstance(): PrismaClient {
        if (!this.instance) {
            throw new Error('Database chưa được khởi tạo. Hãy gọi setup() trước.');
        }
        return this.instance;
    }

    /**
     * Xóa tất cả dữ liệu trong database (cho mỗi test case)
     */
    static async clearDatabase(): Promise<void> {
        if (!this.instance) return;

        const prisma = this.instance;

        // Xóa theo thứ tự để tránh foreign key constraints
        await prisma.quizAnswer.deleteMany();
        await prisma.quizAttempt.deleteMany();
        await prisma.exerciseSubmission.deleteMany();
        await prisma.quizOptionMedia.deleteMany();
        await prisma.quizQuestionMedia.deleteMany();
        await prisma.quizQuestionGroupMedia.deleteMany();
        await prisma.quizOption.deleteMany();
        await prisma.quizQuestion.deleteMany();
        await prisma.quizQuestionGroup.deleteMany();
        await prisma.quizSection.deleteMany();
        await prisma.quiz.deleteMany();
        await prisma.lesson.deleteMany();
        await prisma.exercise.deleteMany();
        await prisma.lecture.deleteMany();
        await prisma.joinRequest.deleteMany();
        await prisma.classroomStudent.deleteMany();
        await prisma.classroom.deleteMany();
        await prisma.activityLog.deleteMany();
        await prisma.refreshToken.deleteMany();
        await prisma.media.deleteMany();
        await prisma.user.deleteMany();
        await prisma.otpRecord.deleteMany();
    }

    /**
     * Đóng kết nối và xóa database file
     */
    static async teardown(): Promise<void> {
        if (this.instance) {
            await this.instance.$disconnect();
            this.instance = null;
        }

        // Xóa file database
        if (this.dbPath && fs.existsSync(this.dbPath)) {
            fs.unlinkSync(this.dbPath);
            this.dbPath = null;
        }
    }

    /**
     * Seed dữ liệu mẫu cho testing
     */
    static async seedTestData() {
        const prisma = this.getInstance();

        // Tạo admin user
        const admin = await prisma.user.create({
            data: {
                email: 'admin@test.com',
                fullName: 'Admin Test',
                phoneNumber: '+84900000001',
                passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz', // Mock hash
                role: 'admin',
                isActive: true,
            },
        });

        // Tạo student users
        const student1 = await prisma.user.create({
            data: {
                email: 'student1@test.com',
                fullName: 'Student One',
                phoneNumber: '+84900000002',
                passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
                role: 'student',
                isActive: true,
            },
        });

        const student2 = await prisma.user.create({
            data: {
                email: 'student2@test.com',
                fullName: 'Student Two',
                phoneNumber: '+84900000003',
                passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
                role: 'student',
                isActive: true,
            },
        });

        // Tạo classroom
        const classroom = await prisma.classroom.create({
            data: {
                name: 'Test Classroom',
                description: 'Classroom for testing',
                isArchived: false,
            },
        });

        // Tạo media (mock)
        const media = await prisma.media.create({
            data: {
                disk: 'local',
                objectKey: 'test/file.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1024,
                visibility: 'private',
                uploadedBy: student1.id,
            },
        });

        return {
            admin,
            student1,
            student2,
            classroom,
            media,
        };
    }
}
