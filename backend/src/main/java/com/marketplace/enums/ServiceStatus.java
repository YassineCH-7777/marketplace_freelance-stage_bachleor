package com.marketplace.enums;

/**
 * Values must match the PostgreSQL enum type `service_status` defined in schema.sql
 */
public enum ServiceStatus {
    DRAFT,
    PUBLISHED,
    SUSPENDED,
    ARCHIVED
}
