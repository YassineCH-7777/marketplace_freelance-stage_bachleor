package com.marketplace.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an action is not authorized.
 */
public class UnauthorizedException extends BusinessException {
	public UnauthorizedException(String message) {
		super(message, HttpStatus.UNAUTHORIZED);
	}
}

