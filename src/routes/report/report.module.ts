import { Module } from '@nestjs/common'
import { ReportController } from './report.controller'
import { ReportService } from './services/report.service'
import { ReportRepo } from './repos/report.repo'

@Module({
    controllers: [ReportController],
    providers: [
        {
            provide: 'IReportService',
            useClass: ReportService,
        },
        {
            provide: 'IReportRepo',
            useClass: ReportRepo,
        },
    ],
})
export class ReportModule {}
