package com.marketplace.domain.enums;

/**
 * Values must match the PostgreSQL enum type `service_status` defined in schema.sql
 */
public enum ServiceStatus {
    DRAFT,
    PUBLISHED,
    SUSPENDED,
    ARCHIVED
}
