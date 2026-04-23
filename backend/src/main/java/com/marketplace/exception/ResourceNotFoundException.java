package com.marketplace.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an entity/resource is not found.
 */
public class ResourceNotFoundException extends BusinessException {
	public ResourceNotFoundException(String message) {
		super(message, HttpStatus.NOT_FOUND);
	}
}

