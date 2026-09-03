package com.attest.attest.dto;

public record VerifyResponse(Long documentId, boolean verified, String result) {}