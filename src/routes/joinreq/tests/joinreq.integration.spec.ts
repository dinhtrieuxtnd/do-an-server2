import { Test, TestingModule } from '@nestjs/testing';
import { JoinreqService } from '../services/joinreq.service';
import { JoinreqRepo } from '../repos/joinreq.repo';
import { PrismaService } from 'src/shared/services/prisma.service';
import { SharedClassroomRepo } from 'src/shared/repos/shared-classroom.repo';
import { SharedClrStdRepo } from 'src/shared/repos/shared-clrstd.repo';
import { SharedJreqRepo } from 'src/shared/repos/shared-join-req.repo';
import { TestDatabaseHelper } from 'src/shared/utils/test-db-helper';
import { JoinRequestStatus, Role } from '@prisma/client';
import { UnprocessableEntityException } from '@nestjs/common';
import { EnumOrder } from 'src/shared/constants/enum-order.constant';
import { JoinreqClassroomSortByEnum } from '../dtos/queries/get-joinreq-classrooms.dto';

describe('Join Request Integration Flow', () => {
    let service: JoinreqService;
    let prisma: PrismaService;
    let testData: any;

    beforeAll(async () => {
        // Khởi tạo in-memory database
        const dbClient = await TestDatabaseHelper.setup();

        // Tạo testing module
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JoinreqService,
                JoinreqRepo,
                {
                    provide: 'IJoinreqService',
                    useClass: JoinreqService,
                },
                {
                    provide: 'IJoinreqRepo',
                    useClass: JoinreqRepo,
                },
                {
                    provide: PrismaService,
                    useValue: dbClient,
                },
                SharedClassroomRepo,
                SharedClrStdRepo,
                SharedJreqRepo,
            ],
        }).compile();

        service = module.get<JoinreqService>(JoinreqService);
        prisma = module.get<PrismaService>(PrismaService);

        // Seed dữ liệu test
        testData = await TestDatabaseHelper.seedTestData();
    });

    afterAll(async () => {
        await TestDatabaseHelper.teardown();
    });

    beforeEach(async () => {
        // Clear join requests và classroom students trước mỗi test
        await prisma.joinRequest.deleteMany();
        await prisma.classroomStudent.deleteMany();
    });

    describe('Luồng 1: Học sinh gửi yêu cầu tham gia, admin duyệt', () => {
        it('Nên cho phép học sinh gửi yêu cầu tham gia lớp học', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Act
            const joinRequest = await service.createJoinRequest(studentId, {
                classroomId,
            });

            // Assert
            expect(joinRequest).toBeDefined();
            expect(joinRequest.studentId).toBe(studentId);
            expect(joinRequest.classroomId).toBe(classroomId);
            expect(joinRequest.status).toBe(JoinRequestStatus.pending);
            expect(joinRequest.requestedAt).toBeInstanceOf(Date);
        });

        it('Không nên cho phép gửi yêu cầu trùng lặp khi đang pending', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Tạo yêu cầu đầu tiên
            await service.createJoinRequest(studentId, { classroomId });

            // Act & Assert
            await expect(
                service.createJoinRequest(studentId, { classroomId })
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('Nên cho phép gửi lại yêu cầu sau khi bị reject', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Tạo và reject yêu cầu
            const firstRequest = await service.createJoinRequest(studentId, { classroomId });
            await service.rejectJoinRequest(firstRequest.id);

            // Act - Gửi lại yêu cầu
            const newRequest = await service.createJoinRequest(studentId, { classroomId });

            // Assert
            expect(newRequest).toBeDefined();
            expect(newRequest.status).toBe(JoinRequestStatus.pending);
            expect(newRequest.requestedAt).toBeInstanceOf(Date);
        });

        it('Admin nên duyệt được yêu cầu tham gia', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Học sinh gửi yêu cầu
            const joinRequest = await service.createJoinRequest(studentId, { classroomId });

            // Act - Admin duyệt yêu cầu
            const approvedRequest = await service.approveJoinRequest(joinRequest.id);

            // Assert
            expect(approvedRequest.status).toBe(JoinRequestStatus.approved);
            expect(approvedRequest.handledAt).toBeInstanceOf(Date);

            // Kiểm tra học sinh đã được thêm vào lớp
            const classroomStudent = await prisma.classroomStudent.findUnique({
                where: {
                    classroomId_studentId: {
                        classroomId,
                        studentId,
                    },
                },
            });

            expect(classroomStudent).toBeDefined();
            expect(classroomStudent!.isActive).toBe(true);
        });

        it('Admin nên từ chối được yêu cầu tham gia', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Học sinh gửi yêu cầu
            const joinRequest = await service.createJoinRequest(studentId, { classroomId });

            // Act - Admin từ chối yêu cầu
            const rejectedRequest = await service.rejectJoinRequest(joinRequest.id);

            // Assert
            expect(rejectedRequest.status).toBe(JoinRequestStatus.rejected);
            expect(rejectedRequest.handledAt).toBeInstanceOf(Date);

            // Kiểm tra học sinh không được thêm vào lớp
            const classroomStudent = await prisma.classroomStudent.findUnique({
                where: {
                    classroomId_studentId: {
                        classroomId,
                        studentId,
                    },
                },
            });

            expect(classroomStudent).toBeNull();
        });

        it('Học sinh nên xem được danh sách lớp học và trạng thái yêu cầu', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Học sinh gửi yêu cầu
            await service.createJoinRequest(studentId, { classroomId });

            // Act - Học sinh xem danh sách lớp học
            const classrooms = await service.studentViewClassrooms(studentId, {
                page: 1,
                limit: 10,
                order: EnumOrder.ASC,
                sortBy: JoinreqClassroomSortByEnum.NAME,
            });

            // Assert
            expect(classrooms.data).toHaveLength(1);
            const classroom = classrooms.data[0];
            expect(classroom.id).toBe(classroomId);
            expect(classroom.isJoined).toBe(false);
            expect(classroom.joinRequest).toBeDefined();
            expect(classroom.joinRequest!.status).toBe(JoinRequestStatus.pending);
        });

        it('Học sinh nên xem được danh sách lớp đã tham gia sau khi được duyệt', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Học sinh gửi yêu cầu và được duyệt
            const joinRequest = await service.createJoinRequest(studentId, { classroomId });
            await service.approveJoinRequest(joinRequest.id);

            // Act - Học sinh xem danh sách lớp đã tham gia
            const joinedClassrooms = await service.studentViewJoinedClassrooms(studentId, {
                page: 1,
                limit: 10,
                order: EnumOrder.ASC,
                sortBy: JoinreqClassroomSortByEnum.NAME,
            });

            // Assert
            expect(joinedClassrooms.data).toHaveLength(1);
            expect(joinedClassrooms.data[0].id).toBe(classroomId);
        });

        it('Học sinh nên rời khỏi lớp học được', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Học sinh gửi yêu cầu và được duyệt
            const joinRequest = await service.createJoinRequest(studentId, { classroomId });
            await service.approveJoinRequest(joinRequest.id);

            // Act - Học sinh rời lớp
            const result = await service.leaveClassroom(studentId, classroomId);

            // Assert
            expect(result.message).toBe('Rời lớp học thành công');
        });

        it('Không nên duyệt yêu cầu đã được duyệt', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Học sinh gửi yêu cầu và được duyệt
            const joinRequest = await service.createJoinRequest(studentId, { classroomId });
            await service.approveJoinRequest(joinRequest.id);

            // Act & Assert - Duyệt lại lần nữa
            await expect(
                service.approveJoinRequest(joinRequest.id)
            ).rejects.toThrow(UnprocessableEntityException);
        });

        it('Không nên từ chối yêu cầu đã được duyệt', async () => {
            // Arrange
            const studentId = testData.student1.id;
            const classroomId = testData.classroom.id;

            // Học sinh gửi yêu cầu và được duyệt
            const joinRequest = await service.createJoinRequest(studentId, { classroomId });
            await service.approveJoinRequest(joinRequest.id);

            // Act & Assert - Từ chối yêu cầu đã duyệt
            await expect(
                service.rejectJoinRequest(joinRequest.id)
            ).rejects.toThrow(UnprocessableEntityException);
        });
    });
});
