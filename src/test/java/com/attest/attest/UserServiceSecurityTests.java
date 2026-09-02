package com.attest.attest;

import com.attest.attest.dto.RegisterRequest;
import com.attest.attest.model.Role;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.service.UserService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceSecurityTests {

    @Test
    void publicRegistrationCannotGrantPrivilegedRole() {
        UserRepository repository = mock(UserRepository.class);
        when(repository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(repository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = new UserService(repository).register(new RegisterRequest("new@example.com", "password123", "ADMIN"));

        assertEquals(Role.VIEWER, user.getRole());
    }
}
