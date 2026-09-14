package com.attest.attest.service;

import com.attest.attest.dto.UsernameAvailabilityResponse;
import com.attest.attest.exception.InvalidUsernameException;
import com.attest.attest.exception.UserNotFoundException;
import com.attest.attest.exception.UsernameTakenException;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * The one place that decides whether a username is legal and who owns it.
 * Both the "set my username" endpoint and the availability-check endpoint
 * route through here so they can never drift — a string that passes the
 * check-availability call is guaranteed to also pass the actual set call
 * (same normalization, same pattern, same uniqueness lookup).
 */
@Service
public class UsernameService {

    private static final Pattern VALID_USERNAME = Pattern.compile("^[a-z0-9_]{3,30}$");
    private static final String FORMAT_MESSAGE =
            "Usernames must be 3–30 characters: lowercase letters, numbers, and underscores only.";

    private final UserRepository userRepository;

    public UsernameService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Lowercases and trims — the only normalization a username ever gets. */
    public String normalize(String raw) {
        return raw == null ? null : raw.trim().toLowerCase(Locale.ROOT);
    }

    private void validateFormat(String normalized) {
        if (normalized == null || !VALID_USERNAME.matcher(normalized).matches()) {
            throw new InvalidUsernameException(FORMAT_MESSAGE);
        }
    }

    /**
     * Format and availability, without mutating anything. Used by the
     * availability-check endpoint, and by {@link #setUsername} before it writes.
     */
    public UsernameAvailabilityResponse checkAvailability(String rawUsername, Long excludingUserId) {
        String normalized = normalize(rawUsername);
        if (normalized == null || !VALID_USERNAME.matcher(normalized).matches()) {
            return UsernameAvailabilityResponse.rejected(FORMAT_MESSAGE);
        }
        return userRepository.findByUsername(normalized)
                .filter(existing -> !existing.getId().equals(excludingUserId))
                .<UsernameAvailabilityResponse>map(existing -> UsernameAvailabilityResponse.rejected(
                        "Username \"" + normalized + "\" is already taken"))
                .orElseGet(UsernameAvailabilityResponse::ok);
    }

    /**
     * Sets (or changes) userId's username. Always acts on the authenticated
     * caller's own id — every controller entry point here takes that id from
     * the JWT request attribute, never from the request body, so a client can
     * never rename another account.
     */
    public User setUsername(Long userId, String rawUsername) {
        String normalized = normalize(rawUsername);
        validateFormat(normalized);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        userRepository.findByUsername(normalized).ifPresent(existing -> {
            if (!existing.getId().equals(userId)) {
                throw new UsernameTakenException(normalized);
            }
        });

        user.setUsername(normalized);
        return userRepository.save(user);
    }
}
