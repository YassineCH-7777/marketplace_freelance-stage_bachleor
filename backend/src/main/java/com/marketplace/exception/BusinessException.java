package com.marketplace.exception;

import org.springframework.http.HttpStatus;

/**
 * Generic application-level business exception that carries an HTTP status.
 */
public class BusinessException extends RuntimeException {
	private final HttpStatus status;

	public BusinessException(String message) {
		this(message, HttpStatus.BAD_REQUEST);
	}

	public BusinessException(String message, HttpStatus status) {
		super(message);
		this.status = status == null ? HttpStatus.BAD_REQUEST : status;
	}

	public HttpStatus getStatus() {
		return status;
	}
}

