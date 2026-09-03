package com.attest.attest;

import com.attest.attest.model.Role;
import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AdminControllerSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void nonAdminCannotChangeRoles() throws Exception {
        User viewer = saveUser(Role.VIEWER);
        User target = saveUser(Role.VIEWER);
        String viewerToken = jwtService.generateToken(viewer.getId(), "VIEWER");

        mockMvc.perform(patch("/api/admin/users/" + target.getId() + "/role")
                        .header("Authorization", "Bearer " + viewerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanPromoteUserAndInvalidRoleIsRejected() throws Exception {
        User admin = saveUser(Role.ADMIN);
        User target = saveUser(Role.VIEWER);
        String adminToken = jwtService.generateToken(admin.getId(), "ADMIN");

        mockMvc.perform(patch("/api/admin/users/" + target.getId() + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"SIGNER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("SIGNER")));

        mockMvc.perform(patch("/api/admin/users/" + target.getId() + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"NOT_A_ROLE\"}"))
                .andExpect(status().isBadRequest());
    }

    private User saveUser(Role role) {
        User user = new User();
        user.setEmail(UUID.randomUUID() + "@example.com");
        user.setPasswordHash("irrelevant-for-this-test");
        user.setRole(role);
        return userRepository.save(user);
    }
}