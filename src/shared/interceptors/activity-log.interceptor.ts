import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Inject,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import type { IActivityLogService } from '../services/activity-log.interface.service'

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
    constructor(
        @Inject('IActivityLogService')
        private readonly activityLogService: IActivityLogService
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const { method, url, user, body, params } = request

        // Chỉ log các method thay đổi dữ liệu
        const shouldLog = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

        if (!shouldLog || !user?.id) {
            return next.handle()
        }

        return next.handle().pipe(
            tap({
                next: (response) => {
                    // Xác định entity type và action từ URL
                    const pathSegments = url.split('/').filter(Boolean)
                    const entityType = pathSegments[0] || 'unknown'
                    
                    // Xác định action
                    let action = method.toLowerCase()
                    if (method === 'POST') action = 'create'
                    if (method === 'PUT' || method === 'PATCH') action = 'update'
                    if (method === 'DELETE') action = 'delete'

                    // Lấy entityId từ params hoặc response
                    const entityId = params?.id || response?.id || body?.id

                    // Tạo metadata
                    const metadata: Record<string, any> = {
                        method,
                        url,
                        timestamp: new Date().toISOString(),
                    }

                    // Thêm thông tin quan trọng từ body (tránh log password)
                    if (body && Object.keys(body).length > 0) {
                        const sanitizedBody = { ...body }
                        delete sanitizedBody.password
                        delete sanitizedBody.passwordHash
                        delete sanitizedBody.otpCode
                        metadata.body = sanitizedBody
                    }

                    // Log bất đồng bộ để không ảnh hưởng response time
                    this.activityLogService
                        .log(user.id, action, entityType, entityId, metadata)
                        .catch((error) => {
                            console.error('Failed to log activity:', error)
                        })
                },
                error: (error) => {
                    // Log cả các thao tác thất bại
                    const pathSegments = url.split('/').filter(Boolean)
                    const entityType = pathSegments[0] || 'unknown'
                    
                    let action = `${method.toLowerCase()}_failed`

                    const metadata: Record<string, any> = {
                        method,
                        url,
                        error: error.message,
                        timestamp: new Date().toISOString(),
                    }

                    this.activityLogService
                        .log(user.id, action, entityType, undefined, metadata)
                        .catch((err) => {
                            console.error('Failed to log failed activity:', err)
                        })
                },
            })
        )
    }
}
