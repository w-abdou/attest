package com.attest.attest.controller;

import com.attest.attest.dto.LoginResponse;
import com.attest.attest.dto.WalletChallengeResponse;
import com.attest.attest.dto.WalletVerifyRequest;
import com.attest.attest.model.User;
import com.attest.attest.service.JwtService;
import com.attest.attest.service.WalletAuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Wallet-native authentication: {@code /challenge} issues a fresh nonce, and
 * {@code /verify} accepts it back together with a wallet's signature over it,
 * proving control of the claimed Sui address before ever finding or creating a
 * user for it. There is no email/password path — this is the only way in.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final WalletAuthService walletAuthService;
    private final JwtService jwtService;

    public AuthController(WalletAuthService walletAuthService, JwtService jwtService) {
        this.walletAuthService = walletAuthService;
        this.jwtService = jwtService;
    }

    @PostMapping("/wallet/challenge")
    public ResponseEntity<WalletChallengeResponse> challenge() {
        return ResponseEntity.ok(walletAuthService.createChallenge());
    }

    @PostMapping("/wallet/verify")
    public ResponseEntity<LoginResponse> verify(@Valid @RequestBody WalletVerifyRequest request) {
        User user = walletAuthService.verifyAndFindOrCreateUser(request);
        String token = jwtService.generateToken(user.getId(), user.getRole().name());
        return ResponseEntity.ok(new LoginResponse(
                user.getId(), user.getEmail(), user.getSuiAddress(), user.getRole(), token));
    }
}
