package com.attest.attest;

import com.attest.attest.exception.InvalidRoleException;
import com.attest.attest.exception.UserNotFoundException;
import com.attest.attest.model.Role;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.service.UserService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceSecurityTests {

    @Test
    void updateRoleChangesRoleForExistingUser() {
        UserRepository repository = mock(UserRepository.class);
        User existing = new User();
        existing.setId(5L);
        existing.setRole(Role.VIEWER);
        when(repository.findById(5L)).thenReturn(Optional.of(existing));
        when(repository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = new UserService(repository).updateRole(5L, "SIGNER");

        assertEquals(Role.SIGNER, updated.getRole());
    }

    @Test
    void updateRoleRejectsUnknownRoleName() {
        UserRepository repository = mock(UserRepository.class);
        UserService service = new UserService(repository);

        assertThrows(InvalidRoleException.class, () -> service.updateRole(5L, "SUPERUSER"));
        verifyNoInteractions(repository);
    }

    @Test
    void updateRoleRejectsUnknownUser() {
        UserRepository repository = mock(UserRepository.class);
        when(repository.findById(99L)).thenReturn(Optional.empty());
        UserService service = new UserService(repository);

        assertThrows(UserNotFoundException.class, () -> service.updateRole(99L, "SIGNER"));
    }

    @Test
    void bootstrapAdminIsSkippedWhenNotConfigured() {
        UserRepository repository = mock(UserRepository.class);
        UserService service = new UserService(repository);

        service.bootstrapAdminIfConfigured("");
        service.bootstrapAdminIfConfigured(null);

        verifyNoInteractions(repository);
    }

    @Test
    void bootstrapAdminIsSkippedWhenAddressAlreadyExists() {
        UserRepository repository = mock(UserRepository.class);
        String address = "0x" + "a".repeat(64);
        when(repository.findBySuiAddress(address)).thenReturn(Optional.of(new User()));
        UserService service = new UserService(repository);

        service.bootstrapAdminIfConfigured(address);

        verify(repository, never()).save(any());
    }

    @Test
    void bootstrapAdminCreatesAdminWhenConfiguredAndAbsent() {
        UserRepository repository = mock(UserRepository.class);
        String address = "0x" + "b".repeat(64);
        when(repository.findBySuiAddress(address)).thenReturn(Optional.empty());
        when(repository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        UserService service = new UserService(repository);

        service.bootstrapAdminIfConfigured(address);

        verify(repository).save(argThat(user -> user.getRole() == Role.ADMIN && address.equals(user.getSuiAddress())));
    }
}
