package com.attest.attest.repository;

import com.attest.attest.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findBySuiAddress(String suiAddress);

    // Usernames are always stored lowercased (UsernameService normalizes before
    // every write), so a plain equality lookup is already case-insensitive —
    // no LOWER(username) needed as long as callers also normalize their input.
    Optional<User> findByUsername(String username);
}
