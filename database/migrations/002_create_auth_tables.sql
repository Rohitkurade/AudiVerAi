CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('ACTIVE', 'DISABLED', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  department VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status),
  KEY idx_users_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  KEY idx_user_roles_role_id (role_id),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_role_permissions_permission_id (permission_id),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent VARCHAR(512) NULL,
  ip_address VARCHAR(45) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY idx_sessions_user_expiry (user_id, expires_at),
  KEY idx_sessions_expires_at (expires_at),
  KEY idx_sessions_revoked_at (revoked_at),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (code, name, description)
VALUES
  ('ADMIN', 'Administrator', 'Manages users, roles, and all platform capabilities.'),
  ('AUDIT_MANAGER', 'Audit Manager', 'Plans, assigns, reviews, and reports on audits.'),
  ('AUDITOR', 'Auditor', 'Performs assigned audit work and records findings and evidence.'),
  ('AUDITEE', 'Auditee', 'Responds to assigned audit requests and findings.')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

INSERT INTO permissions (code, name, description)
VALUES
  ('users.manage', 'Manage users', 'Create, update, disable, and manage users.'),
  ('roles.manage', 'Manage roles', 'Manage roles and their permissions.'),
  ('audits.create', 'Create audits', 'Create audit engagements.'),
  ('audits.view_all', 'View all audits', 'View audits across the organization.'),
  ('audits.view_assigned', 'View assigned audits', 'View audits assigned to the current user.'),
  ('audits.assign', 'Assign audits', 'Assign audits to users.'),
  ('audits.review', 'Review audits', 'Review audit work and status.'),
  ('audits.approve', 'Approve audits', 'Approve audit conclusions.'),
  ('evidence.view', 'View evidence', 'View evidence metadata and records.'),
  ('evidence.upload', 'Upload evidence', 'Upload evidence to an audit.'),
  ('findings.create', 'Create findings', 'Create audit findings.'),
  ('findings.manage', 'Manage findings', 'Manage and update audit findings.'),
  ('findings.respond', 'Respond to findings', 'Respond to assigned findings.'),
  ('reports.view', 'View reports', 'View audit reports.'),
  ('reports.generate', 'Generate reports', 'Generate audit reports.'),
  ('reports.approve', 'Approve reports', 'Approve audit reports.')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_record.id, permission_record.id
FROM roles AS role_record
CROSS JOIN permissions AS permission_record
WHERE role_record.code = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions AS existing
    WHERE existing.role_id = role_record.id
      AND existing.permission_id = permission_record.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_record.id, permission_record.id
FROM roles AS role_record
JOIN permissions AS permission_record
  ON permission_record.code IN (
    'audits.create',
    'audits.view_all',
    'audits.view_assigned',
    'audits.assign',
    'audits.review',
    'evidence.view',
    'findings.create',
    'findings.manage',
    'reports.view',
    'reports.generate'
  )
WHERE role_record.code = 'AUDIT_MANAGER'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions AS existing
    WHERE existing.role_id = role_record.id
      AND existing.permission_id = permission_record.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_record.id, permission_record.id
FROM roles AS role_record
JOIN permissions AS permission_record
  ON permission_record.code IN (
    'audits.view_assigned',
    'evidence.view',
    'evidence.upload',
    'findings.create',
    'reports.view'
  )
WHERE role_record.code = 'AUDITOR'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions AS existing
    WHERE existing.role_id = role_record.id
      AND existing.permission_id = permission_record.id
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_record.id, permission_record.id
FROM roles AS role_record
JOIN permissions AS permission_record
  ON permission_record.code IN (
    'audits.view_assigned',
    'evidence.view',
    'findings.respond'
  )
WHERE role_record.code = 'AUDITEE'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions AS existing
    WHERE existing.role_id = role_record.id
      AND existing.permission_id = permission_record.id
  );
