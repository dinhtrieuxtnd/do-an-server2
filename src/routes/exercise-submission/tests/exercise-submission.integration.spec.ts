import { Test, TestingModule } from '@nestjs/testing';
import { ExerciseSubmissionService } from '../services/exercise-submission.service';
import { ExerciseSubmissionRepo } from '../repos/exercise-submisison.repo';
import { ExerciseService } from 'src/routes/exercise/services/exercise.service';
import { ExerciseRepo } from 'src/routes/exercise/repos/exercise.repo';
import { LessonService } from 'src/routes/lesson/services/lesson.service';
import { LessonRepo } from 'src/routes/lesson/repos/lesson.repo';
import { PrismaService } from 'src/shared/services/prisma.service';
import { SharedClrStdRepo } from 'src/shared/repos/shared-clrstd.repo';
import { SharedMediaRepo } from 'src/shared/repos/shared-media.repo';
import { SharedLessonRepo } from 'src/shared/repos/shared-lesson.repo';
import { TestDatabaseHelper } from 'src/shared/utils/test-db-helper';
import { LessonType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Exercise Submission Integration Flow', () => {
    let exerciseSubmissionService: ExerciseSubmissionService;
    let exerciseService: ExerciseService;
    let lessonService: LessonService;
    let prisma: PrismaService;
    let testData: any;

    beforeAll(async () => {
        // Khởi tạo in-memory database
        const dbClient = await TestDatabaseHelper.setup();

        // Tạo testing module
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExerciseSubmissionService,
                ExerciseSubmissionRepo,
                ExerciseService,
                ExerciseRepo,
                LessonService,
                LessonRepo,
                {
                    provide: 'IExerciseSubmissionService',
                    useClass: ExerciseSubmissionService,
                },
                {
                    provide: 'IExerciseSubmissionRepo',
                    useClass: ExerciseSubmissionRepo,
                },
                {
                    provide: 'IExerciseService',
                    useClass: ExerciseService,
                },
                {
                    provide: 'IExerciseRepo',
                    useClass: ExerciseRepo,
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
                SharedClrStdRepo,
                SharedMediaRepo,
                SharedLessonRepo,
            ],
        }).compile();

        exerciseSubmissionService = module.get<ExerciseSubmissionService>(ExerciseSubmissionService);
        exerciseService = module.get<ExerciseService>(ExerciseService);
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
        // Clear exercise-related data trước mỗi test
        await prisma.exerciseSubmission.deleteMany();
        await prisma.lesson.deleteMany();
        await prisma.exercise.deleteMany();
    });

    describe('Luồng 2: Admin giao bài tập, học sinh xem và làm bài tập', () => {
        it('Admin nên tạo được bài tập', async () => {
            // Act - Admin tạo bài tập
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
                attachMediaId: testData.media.id,
            });

            // Assert
            expect(exercise).toBeDefined();
            expect(exercise.title).toBe('Bài tập tuần 1');
            expect(exercise.description).toBe('Làm bài tập về NestJS');
            expect(exercise.attachMediaId).toBe(testData.media.id);
        });

        it('Admin nên gán được bài tập cho lớp học', async () => {
            // Arrange - Tạo bài tập trước
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);

            // Act - Admin gán bài tập cho lớp
            const lesson = await lessonService.assignExercise({
                classroomId: testData.classroom.id,
                exerciseId: exercise.id,
                orderIndex: 1,
                exerciseDueAt: dueDate,
                lessonType: LessonType.exercise,
            });

            // Assert
            expect(lesson).toBeDefined();
            expect(lesson.classroomId).toBe(testData.classroom.id);
            expect(lesson.exerciseId).toBe(exercise.id);
            expect(lesson.lessonType).toBe(LessonType.exercise);
            expect(lesson.exerciseDueAt).toEqual(dueDate);
        });

        it('Học sinh nên xem được danh sách bài tập của lớp', async () => {
            // Arrange - Tạo và gán bài tập
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            await lessonService.assignExercise({
                classroomId: testData.classroom.id,
                exerciseId: exercise.id,
                orderIndex: 1,
                exerciseDueAt: new Date(),
                lessonType: LessonType.exercise,
            });

            // Act - Học sinh xem danh sách bài học
            const lessons = await lessonService.getLessonsByClassroom({
                classroomId: testData.classroom.id,
            });

            // Assert
            expect(lessons.lessons).toHaveLength(1);
            expect(lessons.lessons[0].lessonType).toBe(LessonType.exercise);
            expect(lessons.lessons[0]).toHaveProperty('exercise');
        });

        it('Học sinh nên nộp được bài tập', async () => {
            // Arrange - Tạo và gán bài tập
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            const lesson = await lessonService.assignExercise({
                classroomId: testData.classroom.id,
                exerciseId: exercise.id,
                orderIndex: 1,
                exerciseDueAt: new Date(),
                lessonType: LessonType.exercise,
            });

            // Act - Học sinh nộp bài
            const submission = await exerciseSubmissionService.submit(testData.student1.id, {
                lessonId: lesson.id,
                exerciseId: exercise.id,
                mediaId: testData.media.id,
            });

            // Assert
            expect(submission).toBeDefined();
            expect(submission.studentId).toBe(testData.student1.id);
            expect(submission.lessonId).toBe(lesson.id);
            expect(submission.exerciseId).toBe(exercise.id);
            expect(submission.mediaId).toBe(testData.media.id);
            expect(submission.submittedAt).toBeInstanceOf(Date);
            expect(submission.score).toBeNull();
            expect(submission.gradedAt).toBeNull();
        });

        it('Học sinh không nên nộp bài tập 2 lần', async () => {
            // Arrange - Tạo và gán bài tập
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            const lesson = await lessonService.assignExercise({
                classroomId: testData.classroom.id,
                exerciseId: exercise.id,
                orderIndex: 1,
                exerciseDueAt: new Date(),
                lessonType: LessonType.exercise,
            });

            // Nộp lần 1
            await exerciseSubmissionService.submit(testData.student1.id, {
                lessonId: lesson.id,
                exerciseId: exercise.id,
                mediaId: testData.media.id,
            });

            // Act & Assert - Nộp lần 2
            await expect(
                exerciseSubmissionService.submit(testData.student1.id, {
                    lessonId: lesson.id,
                    exerciseId: exercise.id,
                    mediaId: testData.media.id,
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('Admin nên xem được danh sách bài nộp', async () => {
            // Arrange - Tạo bài tập, gán và có học sinh nộp
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            const lesson = await lessonService.assignExercise({
                classroomId: testData.classroom.id,
                exerciseId: exercise.id,
                orderIndex: 1,
                exerciseDueAt: new Date(),
                lessonType: LessonType.exercise,
            });

            await exerciseSubmissionService.submit(testData.student1.id, {
                lessonId: lesson.id,
                exerciseId: exercise.id,
                mediaId: testData.media.id,
            });

            // Act - Admin xem danh sách bài nộp
            const submissions = await exerciseSubmissionService.getSubmissionsByLessonId(lesson.id);

            // Assert
            expect(submissions).toHaveLength(1);
            expect(submissions[0].studentId).toBe(testData.student1.id);
            expect(submissions[0]).toHaveProperty('student');
            expect(submissions[0].student?.fullName).toBe(testData.student1.fullName);
        });

        it('Admin nên chấm điểm được bài nộp', async () => {
            // Arrange - Tạo bài tập, gán và có học sinh nộp
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            const lesson = await lessonService.assignExercise({
                classroomId: testData.classroom.id,
                exerciseId: exercise.id,
                orderIndex: 1,
                exerciseDueAt: new Date(),
                lessonType: LessonType.exercise,
            });

            const submission = await exerciseSubmissionService.submit(testData.student1.id, {
                lessonId: lesson.id,
                exerciseId: exercise.id,
                mediaId: testData.media.id,
            });

            // Act - Admin chấm điểm
            const gradedSubmission = await exerciseSubmissionService.gradeSubmission(submission.id, {
                score: 9.5,
                comment: 'Bài làm tốt!',
            });

            // Assert
            expect(gradedSubmission).toBeDefined();
            expect(gradedSubmission.score).toBe(9.5);
            expect(gradedSubmission.comment).toBe('Bài làm tốt!');
            expect(gradedSubmission.gradedAt).toBeInstanceOf(Date);
        });

        it('Học sinh nên xóa được bài nộp của mình', async () => {
            // Arrange - Tạo và nộp bài
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            const lesson = await lessonService.assignExercise({
                classroomId: testData.classroom.id,
                exerciseId: exercise.id,
                orderIndex: 1,
                exerciseDueAt: new Date(),
                lessonType: LessonType.exercise,
            });

            const submission = await exerciseSubmissionService.submit(testData.student1.id, {
                lessonId: lesson.id,
                exerciseId: exercise.id,
                mediaId: testData.media.id,
            });

            // Act - Học sinh xóa bài nộp
            const result = await exerciseSubmissionService.deleteSubmission(
                testData.student1.id,
                submission.id
            );

            // Assert
            expect(result.message).toBe('Xóa bài nộp thành công');

            // Verify bài nộp đã bị xóa
            const deletedSubmission = await prisma.exerciseSubmission.findUnique({
                where: { id: submission.id },
            });
            expect(deletedSubmission).toBeNull();
        });

        it('Học sinh không nên nộp bài nếu không phải thành viên lớp', async () => {
            // Arrange - Tạo và gán bài tập
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            const lesson = await lessonService.assignExercise({
                classroomId: testData.classroom.id,
                exerciseId: exercise.id,
                orderIndex: 1,
                exerciseDueAt: new Date(),
                lessonType: LessonType.exercise,
            });

            // Act & Assert - Student2 (không phải thành viên) nộp bài
            await expect(
                exerciseSubmissionService.submit(testData.student2.id, {
                    lessonId: lesson.id,
                    exerciseId: exercise.id,
                    mediaId: testData.media.id,
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('Học sinh không nên nộp bài nếu bài học không tồn tại', async () => {
            // Act & Assert
            await expect(
                exerciseSubmissionService.submit(testData.student1.id, {
                    lessonId: 99999,
                    exerciseId: 99999,
                    mediaId: testData.media.id,
                })
            ).rejects.toThrow(NotFoundException);
        });

        it('Admin nên cập nhật được thông tin bài tập', async () => {
            // Arrange
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            // Act - Cập nhật bài tập
            const updatedExercise = await exerciseService.update(exercise.id, {
                title: 'Bài tập tuần 1 (Đã sửa)',
                description: 'Làm bài tập về NestJS và TypeScript',
            });

            // Assert
            expect(updatedExercise.title).toBe('Bài tập tuần 1 (Đã sửa)');
            expect(updatedExercise.description).toBe('Làm bài tập về NestJS và TypeScript');
        });

        it('Admin nên xóa được bài tập', async () => {
            // Arrange
            const exercise = await exerciseService.create({
                title: 'Bài tập tuần 1',
                description: 'Làm bài tập về NestJS',
            });

            // Act - Xóa bài tập
            const result = await exerciseService.delete(exercise.id);

            // Assert
            expect(result.message).toBe('Xóa bài tập thành công');

            // Verify bài tập đã bị soft delete
            const deletedExercise = await prisma.exercise.findUnique({
                where: { id: exercise.id },
            });
            expect(deletedExercise!.deletedAt).not.toBeNull();
        });
    });
});
