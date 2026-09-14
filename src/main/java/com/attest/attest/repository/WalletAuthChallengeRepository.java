package com.attest.attest.repository;

import com.attest.attest.model.WalletAuthChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface WalletAuthChallengeRepository extends JpaRepository<WalletAuthChallenge, Long> {

    Optional<WalletAuthChallenge> findByNonce(String nonce);

    /**
     * Atomically marks a nonce used, but only if it exists, is unused, and is not
     * expired — all in one conditional UPDATE, so two concurrent verify requests
     * for the same nonce can't both pass a separate "is it used?" check before
     * either writes back. Returns the number of rows updated: 1 means this caller
     * won the race and may proceed, 0 means the nonce was invalid, already used,
     * or expired.
     */
    @Modifying
    @Query("update WalletAuthChallenge c set c.used = true " +
            "where c.nonce = :nonce and c.used = false and c.expiresAt > :now")
    int consume(@Param("nonce") String nonce, @Param("now") Instant now);
}
