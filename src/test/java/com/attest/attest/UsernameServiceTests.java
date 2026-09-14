package com.attest.attest;

import com.attest.attest.dto.UsernameAvailabilityResponse;
import com.attest.attest.exception.InvalidUsernameException;
import com.attest.attest.exception.UserNotFoundException;
import com.attest.attest.exception.UsernameTakenException;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.service.UsernameService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UsernameServiceTests {

    @Test
    void normalizeLowercasesAndTrims() {
        UsernameService service = new UsernameService(mock(UserRepository.class));
        assertEquals("legal_lead", service.normalize("  Legal_Lead  "));
        assertNull(service.normalize(null));
    }

    @Test
    void validFormatsAreAccepted() {
        UserRepository repository = mock(UserRepository.class);
        UsernameService service = new UsernameService(repository);
        for (String candidate : new String[]{"abc", "user_1", "a".repeat(30), "legal_team_2026"}) {
            when(repository.findByUsername(candidate.toLowerCase())).thenReturn(Optional.empty());
            assertTrue(service.checkAvailability(candidate, null).available(), candidate + " should be valid");
        }
    }

    @Test
    void tooShortIsRejected() {
        UsernameService service = new UsernameService(mock(UserRepository.class));
        UsernameAvailabilityResponse result = service.checkAvailability("ab", null);
        assertFalse(result.available());
        assertNotNull(result.reason());
    }

    @Test
    void tooLongIsRejected() {
        UsernameService service = new UsernameService(mock(UserRepository.class));
        assertFalse(service.checkAvailability("a".repeat(31), null).available());
    }

    @Test
    void uppercaseInputIsAcceptedAndNormalized() {
        // Format is checked against the NORMALIZED (lowercased) string, so a
        // user typing "Legal_Lead" is accepted, not rejected for capitalization
        // — it's stored as "legal_lead", per the case-insensitive-uniqueness
        // requirement, rather than making capitalization the user's problem.
        UserRepository repository = mock(UserRepository.class);
        UsernameService service = new UsernameService(repository);
        when(repository.findByUsername("legal_lead")).thenReturn(Optional.empty());

        assertTrue(service.checkAvailability("Legal_Lead", null).available());
    }

    @Test
    void symbolsAndSpacesAreRejected() {
        UsernameService service = new UsernameService(mock(UserRepository.class));
        for (String candidate : new String[]{"legal-lead", "legal lead", "legal@lead", "légal", "user!"}) {
            assertFalse(service.checkAvailability(candidate, null).available(), candidate + " should be invalid");
        }
    }

    @Test
    void takenUsernameIsUnavailable() {
        UserRepository repository = mock(UserRepository.class);
        UsernameService service = new UsernameService(repository);
        User existing = new User(); existing.setId(9L); existing.setUsername("taken");
        when(repository.findByUsername("taken")).thenReturn(Optional.of(existing));

        UsernameAvailabilityResponse result = service.checkAvailability("taken", 1L);
        assertFalse(result.available());
    }

    @Test
    void checkingYourOwnCurrentUsernameIsStillAvailable() {
        UserRepository repository = mock(UserRepository.class);
        UsernameService service = new UsernameService(repository);
        User self = new User(); self.setId(1L); self.setUsername("myself");
        when(repository.findByUsername("myself")).thenReturn(Optional.of(self));

        assertTrue(service.checkAvailability("myself", 1L).available());
    }

    @Test
    void setUsernameSavesNormalizedValue() {
        UserRepository repository = mock(UserRepository.class);
        UsernameService service = new UsernameService(repository);
        User user = new User(); user.setId(1L);
        when(repository.findById(1L)).thenReturn(Optional.of(user));
        when(repository.findByUsername("legal_lead")).thenReturn(Optional.empty());
        when(repository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User saved = service.setUsername(1L, "Legal_Lead");

        assertEquals("legal_lead", saved.getUsername());
    }

    @Test
    void setUsernameRejectsInvalidFormat() {
        UsernameService service = new UsernameService(mock(UserRepository.class));
        assertThrows(InvalidUsernameException.class, () -> service.setUsername(1L, "no"));
    }

    @Test
    void setUsernameRejectsUnknownUser() {
        UserRepository repository = mock(UserRepository.class);
        UsernameService service = new UsernameService(repository);
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> service.setUsername(99L, "valid_name"));
    }

    @Test
    void setUsernameRejectsWhenTakenBySomeoneElse() {
        UserRepository repository = mock(UserRepository.class);
        UsernameService service = new UsernameService(repository);
        User caller = new User(); caller.setId(1L);
        User other = new User(); other.setId(2L); other.setUsername("taken");
        when(repository.findById(1L)).thenReturn(Optional.of(caller));
        when(repository.findByUsername("taken")).thenReturn(Optional.of(other));

        assertThrows(UsernameTakenException.class, () -> service.setUsername(1L, "taken"));
    }

    @Test
    void setUsernameAllowsReassigningToYourOwnCurrentUsername() {
        UserRepository repository = mock(UserRepository.class);
        UsernameService service = new UsernameService(repository);
        User self = new User(); self.setId(1L); self.setUsername("myself");
        when(repository.findById(1L)).thenReturn(Optional.of(self));
        when(repository.findByUsername("myself")).thenReturn(Optional.of(self));
        when(repository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> service.setUsername(1L, "myself"));
    }
}
