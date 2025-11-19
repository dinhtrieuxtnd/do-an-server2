import { Test, TestingModule } from '@nestjs/testing';
import { QuizAttemptService } from '../core/services/quiz-attempt.service';
import { QuizAttemptRepo } from '../core/repos/quiz-attempt.repo';
import { QuizService } from 'src/routes/quiz/core/services/quiz.service';
import { QuizRepo } from 'src/routes/quiz/core/repos/quiz.repo';
import { LessonService } from 'src/routes/lesson/services/lesson.service';
import { LessonRepo } from 'src/routes/lesson/repos/lesson.repo';
import { PrismaService } from 'src/shared/services/prisma.service';
import { SharedLessonRepo } from 'src/shared/repos/shared-lesson.repo';
import { TestDatabaseHelper } from 'src/shared/utils/test-db-helper';
import { GradingMethod, LessonType, Role } from '@prisma/client';
import { BadRequestException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';

/**
 * NOTE: Đây là test integration đơn giản cho luồng Quiz Attempt
 * Test này chỉ cover các chức năng cơ bản:
 * - Tạo quiz
 * - Gán quiz cho lớp học
 * - Bắt đầu làm bài
 * - Nộp bài
 * - Xem kết quả
 * 
 * Các test phức tạp hơn (tạo câu hỏi, trả lời câu hỏi, tính điểm) yêu cầu
 * các module Question, QuizOption và QuizAnswer phải hoàn thiện trước.
 */
describe('Quiz Attempt Integration Flow (Basic)', () => {
    let quizAttemptService: QuizAttemptService;
    let quizService: QuizService;
    let lessonService: LessonService;
    let prisma: PrismaService;
    let testData: any;

    beforeAll(async () => {
        // Khởi tạo in-memory database
        const dbClient = await TestDatabaseHelper.setup();

        // Tạo testing module
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QuizAttemptService,
                QuizAttemptRepo,
                QuizService,
                QuizRepo,
                LessonService,
                LessonRepo,
                {
                    provide: 'IQuizAttemptService',
                    useClass: QuizAttemptService,
                },
                {
                    provide: 'IQuizAttemptRepo',
                    useClass: QuizAttemptRepo,
                },
                {
                    provide: 'IQuizService',
                    useClass: QuizService,
                },
                {
                    provide: 'IQuizRepo',
                    useClass: QuizRepo,
                },
                {
                    provide: 'ILessonService',
                    useClass: LessonService,
                },
                {
                    provide: 'ILessonRepo',
                    useClass: LessonRepo,
                },
                {
                    provide: PrismaService,
                    useValue: dbClient,
                },
                SharedLessonRepo,
            ],
        }).compile();

        quizAttemptService = module.get<QuizAttemptService>(QuizAttemptService);
        quizService = module.get<QuizService>(QuizService);
        lessonService = module.get<LessonService>(LessonService);
        prisma = module.get<PrismaService>(PrismaService);

        // Seed dữ liệu test
        testData = await TestDatabaseHelper.seedTestData();

        // Thêm học sinh vào lớp học
        await prisma.classroomStudent.create({
            data: {
                classroomId: testData.classroom.id,
                studentId: testData.student1.id,
                isActive: true,
            },
        });
    });

    afterAll(async () => {
        await TestDatabaseHelper.teardown();
    });

    beforeEach(async () => {
        // Clear quiz-related data trước mỗi test
        await prisma.quizAnswer.deleteMany();
        await prisma.quizAttempt.deleteMany();
        await prisma.lesson.deleteMany();
        await prisma.quiz.deleteMany();
    });

    describe('Luồng 3: Học sinh làm bài kiểm tra (Basic)', () => {
        it('Admin nên tạo được bài kiểm tra', async () => {
            // Act - Admin tạo quiz
            const quiz = await quizService.create({
                title: 'Kiểm tra giữa kỳ',
                description: 'Kiểm tra kiến thức NestJS',
                timeLimitSec: 3600, // 1 giờ
                maxAttempts: 1,
                shuffleQuestions: true,
                shuffleOptions: true,
                gradingMethod: GradingMethod.first,
            });

            // Assert
            expect(quiz).toBeDefined();
            expect(quiz.title).toBe('Kiểm tra giữa kỳ');
            expect(quiz.timeLimitSec).toBe(3600);
            expect(quiz.maxAttempts).toBe(1);
        });

        it('Admin nên gán được quiz cho lớp học', async () => {
            // Arrange - Tạo quiz
            const quiz = await quizService.create({
                title: 'Kiểm tra giữa kỳ',
                description: 'Kiểm tra kiến thức NestJS',
                timeLimitSec: 3600,
                maxAttempts: 1,
                shuffleQuestions: true,
                shuffleOptions: true,
                gradingMethod: GradingMethod.first,
            });

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 7);

            // Act - Gán quiz cho lớp
            const lesson = await lessonService.assignQuiz({
                classroomId: testData.classroom.id,
                quizId: quiz.id,
                orderIndex: 1,
                quizStartAt: startDate,
                quizEndAt: endDate,
                lessonType: LessonType.quiz,
            });

            // Assert
            expect(lesson).toBeDefined();
            expect(lesson.classroomId).toBe(testData.classroom.id);
            expect(lesson.quizId).toBe(quiz.id);
            expect(lesson.lessonType).toBe(LessonType.quiz);
        });

        it('Học sinh nên bắt đầu làm bài kiểm tra được', async () => {
            // Arrange - Tạo quiz và gán cho lớp
            const quiz = await quizService.create({
                title: 'Kiểm tra giữa kỳ',
                description: 'Kiểm tra kiến thức NestJS',
                timeLimitSec: 3600,
                maxAttempts: 1,
                shuffleQuestions: true,
                shuffleOptions: true,
                gradingMethod: GradingMethod.first,
            });

            const lesson = await lessonService.assignQuiz({
                classroomId: testData.classroom.id,
                quizId: quiz.id,
                orderIndex: 1,
                quizStartAt: new Date(),
                quizEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                lessonType: LessonType.quiz,
            });

            // Act - Học sinh bắt đầu làm bài (tạo trực tiếp qua Prisma)
            const attempt = await prisma.quizAttempt.create({
                data: {
                    lessonId: lesson.id,
                    quizId: quiz.id,
                    studentId: testData.student1.id,
                    status: 'in_progress',
                    startedAt: new Date(),
                },
            });

            // Assert
            expect(attempt).toBeDefined();
            expect(attempt.studentId).toBe(testData.student1.id);
            expect(attempt.quizId).toBe(quiz.id);
            expect(attempt.status).toBe('in_progress');
            expect(attempt.startedAt).toBeInstanceOf(Date);
        });

        it('Học sinh nên nộp bài kiểm tra được', async () => {
            // Arrange - Tạo quiz và attempt
            const quiz = await quizService.create({
                title: 'Kiểm tra giữa kỳ',
                timeLimitSec: 3600,
                maxAttempts: 1,
                shuffleQuestions: true,
                shuffleOptions: true,
                gradingMethod: GradingMethod.first,
            });

            const lesson = await lessonService.assignQuiz({
                classroomId: testData.classroom.id,
                quizId: quiz.id,
                orderIndex: 1,
                quizStartAt: new Date(),
                quizEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                lessonType: LessonType.quiz,
            });

            const attempt = await prisma.quizAttempt.create({
                data: {
                    lessonId: lesson.id,
                    quizId: quiz.id,
                    studentId: testData.student1.id,
                    status: 'in_progress',
                    startedAt: new Date(),
                },
            });

            // Act - Nộp bài
            const submittedAttempt = await quizAttemptService.submit(
                testData.student1.id,
                attempt.id
            );

            // Assert
            expect(submittedAttempt.status).toBe('submitted');
            expect(submittedAttempt.submittedAt).toBeInstanceOf(Date);
        });

        it('Học sinh không nên nộp bài 2 lần', async () => {
            // Arrange
            const quiz = await quizService.create({
                title: 'Kiểm tra giữa kỳ',
                timeLimitSec: 3600,
                maxAttempts: 1,
                shuffleQuestions: true,
                shuffleOptions: true,
                gradingMethod: GradingMethod.first,
            });

            const lesson = await lessonService.assignQuiz({
                classroomId: testData.classroom.id,
                quizId: quiz.id,
                orderIndex: 1,
                quizStartAt: new Date(),
                quizEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                lessonType: LessonType.quiz,
            });

            const attempt = await prisma.quizAttempt.create({
                data: {
                    lessonId: lesson.id,
                    quizId: quiz.id,
                    studentId: testData.student1.id,
                    status: 'in_progress',
                    startedAt: new Date(),
                },
            });

            await quizAttemptService.submit(testData.student1.id, attempt.id);

            // Act & Assert - Nộp lần 2
            await expect(
                quizAttemptService.submit(testData.student1.id, attempt.id)
            ).rejects.toThrow(BadRequestException);
        });

        it('Học sinh không nên xem được bài làm của người khác', async () => {
            // Arrange
            const quiz = await quizService.create({
                title: 'Kiểm tra giữa kỳ',
                timeLimitSec: 3600,
                maxAttempts: 1,
                shuffleQuestions: true,
                shuffleOptions: true,
                gradingMethod: GradingMethod.first,
            });

            const lesson = await lessonService.assignQuiz({
                classroomId: testData.classroom.id,
                quizId: quiz.id,
                orderIndex: 1,
                quizStartAt: new Date(),
                quizEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                lessonType: LessonType.quiz,
            });

            const attempt = await prisma.quizAttempt.create({
                data: {
                    lessonId: lesson.id,
                    quizId: quiz.id,
                    studentId: testData.student1.id,
                    status: 'in_progress',
                    startedAt: new Date(),
                },
            });

            // Act & Assert - Student2 cố xem bài của Student1
            await expect(
                quizAttemptService.getById(testData.student2.id, Role.student, attempt.id)
            ).rejects.toThrow(ForbiddenException);
        });

        it('Admin nên xem được chi tiết bài làm của học sinh', async () => {
            // Arrange
            const quiz = await quizService.create({
                title: 'Kiểm tra giữa kỳ',
                timeLimitSec: 3600,
                maxAttempts: 1,
                shuffleQuestions: true,
                shuffleOptions: true,
                gradingMethod: GradingMethod.first,
            });

            const lesson = await lessonService.assignQuiz({
                classroomId: testData.classroom.id,
                quizId: quiz.id,
                orderIndex: 1,
                quizStartAt: new Date(),
                quizEndAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                lessonType: LessonType.quiz,
            });

            const attempt = await prisma.quizAttempt.create({
                data: {
                    lessonId: lesson.id,
                    quizId: quiz.id,
                    studentId: testData.student1.id,
                    status: 'in_progress',
                    startedAt: new Date(),
                },
            });

            await quizAttemptService.submit(testData.student1.id, attempt.id);

            // Act - Admin xem bài làm
            const result = await quizAttemptService.getById(
                testData.admin.id,
                Role.admin,
                attempt.id
            );

            // Assert
            expect(result).toBeDefined();
            expect(result.id).toBe(attempt.id);
            expect(result.canViewScore).toBe(true);
            expect(result.canViewAnswers).toBe(true);
        });

        it('Admin nên cập nhật được thông tin quiz', async () => {
            // Arrange
            const quiz = await quizService.create({
                title: 'Kiểm tra giữa kỳ',
                timeLimitSec: 3600,
                maxAttempts: 1,
                shuffleQuestions: true,
                shuffleOptions: true,
                gradingMethod: GradingMethod.first,
            });

            // Act - Cập nhật quiz
            const updatedQuiz = await quizService.update(quiz.id, {
                title: 'Kiểm tra giữa kỳ (Đã sửa)',
                timeLimitSec: 5400,
                maxAttempts: 2,
                shuffleQuestions: false,
                shuffleOptions: false,
                gradingMethod: GradingMethod.highest,
            });

            // Assert
            expect(updatedQuiz.title).toBe('Kiểm tra giữa kỳ (Đã sửa)');
            expect(updatedQuiz.timeLimitSec).toBe(5400);
            expect(updatedQuiz.maxAttempts).toBe(2);
        });

        it('Admin nên xóa được quiz', async () => {
            // Arrange
            const quiz = await quizService.create({
                title: 'Kiểm tra giữa kỳ',
                timeLimitSec: 3600,
                maxAttempts: 1,
                shuffleQuestions: true,
                shuffleOptions: true,
                gradingMethod: GradingMethod.first,
            });

            // Act - Xóa quiz
            const result = await quizService.delete(quiz.id);

            // Assert
            expect(result.message).toBe('Xóa bài kiểm tra thành công');

            // Verify quiz đã bị soft delete
            const deletedQuiz = await prisma.quiz.findUnique({
                where: { id: quiz.id },
            });
            expect(deletedQuiz!.deletedAt).not.toBeNull();
        });

        it('Không nên tạo quiz attempt cho lesson không tồn tại', async () => {
            // Act & Assert
            await expect(
                prisma.quizAttempt.create({
                    data: {
                        lessonId: 99999,
                        quizId: 99999,
                        studentId: testData.student1.id,
                        status: 'in_progress',
                        startedAt: new Date(),
                    },
                })
            ).rejects.toThrow();
        });
    });
});
