package com.v3dental.attendance.audit;

import com.v3dental.attendance.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void logAction(User user, String action, String entityType, Long entityId, String description) {
        AuditLog log = AuditLog.builder()
            .user(user)
            .action(action)
            .entityType(entityType)
            .entityId(entityId)
            .description(description)
            .build();
        auditLogRepository.save(log);
    }
}
