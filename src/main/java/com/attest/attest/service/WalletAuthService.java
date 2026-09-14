package com.attest.attest.service;

import com.attest.attest.dto.WalletChallengeResponse;
import com.attest.attest.dto.WalletVerifyRequest;
import com.attest.attest.exception.InvalidCredentialsException;
import com.attest.attest.model.Role;
import com.attest.attest.model.User;
import com.attest.attest.model.WalletAuthChallenge;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.repository.WalletAuthChallengeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

/**
 * Wallet-native login: a fresh, single-use, time-limited nonce is issued by
 * {@link #createChallenge()}; {@link #verifyAndFindOrCreateUser} accepts it back
 * only alongside a signature that {@link SuiSignatureVerifier} confirms was
 * produced by the claimed address. This is the only way an Attest account is
 * ever created or authenticated — there is no password path.
 */
@Service
public class WalletAuthService {

    private static final int NONCE_BYTES = 24;

    private final WalletAuthChallengeRepository challengeRepository;
    private final UserRepository userRepository;
    private final SuiSignatureVerifier signatureVerifier;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Duration challengeTtl;

    public WalletAuthService(
            WalletAuthChallengeRepository challengeRepository,
            UserRepository userRepository,
            SuiSignatureVerifier signatureVerifier,
            @Value("${app.sui.challenge-ttl-seconds}") long challengeTtlSeconds
    ) {
        this.challengeRepository = challengeRepository;
        this.userRepository = userRepository;
        this.signatureVerifier = signatureVerifier;
        this.challengeTtl = Duration.ofSeconds(challengeTtlSeconds);
    }

    public WalletChallengeResponse createChallenge() {
        String nonce = randomNonce();
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(challengeTtl);
        String message = buildMessage(nonce, issuedAt, expiresAt);

        WalletAuthChallenge challenge = new WalletAuthChallenge();
        challenge.setNonce(nonce);
        challenge.setMessage(message);
        challenge.setExpiresAt(expiresAt);
        challengeRepository.save(challenge);

        return new WalletChallengeResponse(nonce, message, expiresAt);
    }

    /**
     * Consumes the nonce (single-use, atomically) and verifies the signature
     * before ever looking up or creating a user — a request with a replayed,
     * expired, or unknown nonce, or an invalid signature, never reaches the
     * database's user table at all.
     */
    @Transactional
    public User verifyAndFindOrCreateUser(WalletVerifyRequest request) {
        int consumed = challengeRepository.consume(request.nonce(), Instant.now());
        if (consumed != 1) {
            throw new InvalidCredentialsException();
        }

        WalletAuthChallenge challenge = challengeRepository.findByNonce(request.nonce())
                .orElseThrow(InvalidCredentialsException::new);

        boolean signatureValid = signatureVerifier.verifyPersonalMessage(
                challenge.getMessage().getBytes(StandardCharsets.UTF_8),
                request.signature(),
                request.address());
        if (!signatureValid) {
            throw new InvalidCredentialsException();
        }

        return userRepository.findBySuiAddress(request.address())
                .orElseGet(() -> createUser(request.address()));
    }

    private User createUser(String suiAddress) {
        User user = new User();
        user.setSuiAddress(suiAddress);
        // Same default — and the same reasoning — as the retired public
        // registration endpoint: reduces onboarding friction in the team-based
        // model, where team-scoped roles are the primary access control. A
        // brand-new address can never come back as anything but SIGNER; ADMIN
        // is only ever reached via the bootstrap address or a later promotion.
        user.setRole(Role.SIGNER);
        return userRepository.save(user);
    }

    private String randomNonce() {
        byte[] bytes = new byte[NONCE_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String buildMessage(String nonce, Instant issuedAt, Instant expiresAt) {
        return "Sign in to Attest\n\n"
                + "This request will not trigger a blockchain transaction or cost any gas.\n\n"
                + "Nonce: " + nonce + "\n"
                + "Issued at: " + issuedAt + "\n"
                + "Expires at: " + expiresAt;
    }
}
