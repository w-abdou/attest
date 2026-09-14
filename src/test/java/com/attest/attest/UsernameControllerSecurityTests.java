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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class UsernameControllerSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void settingUsernameAlwaysActsOnTheAuthenticatedCallerNotAnyBodyField() throws Exception {
        User user = saveWalletUser();
        String token = jwtService.generateToken(user.getId(), "SIGNER");

        mockMvc.perform(post("/api/users/me/username")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"Legal_Lead\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("legal_lead")))
                .andExpect(jsonPath("$.id", is(user.getId().intValue())));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(post("/api/users/me/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"whoever\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidFormatIsRejectedWithABadRequest() throws Exception {
        User user = saveWalletUser();
        String token = jwtService.generateToken(user.getId(), "SIGNER");

        mockMvc.perform(post("/api/users/me/username")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"a\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/users/me/username")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"has space\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void takenUsernameIsRejectedWithConflict() throws Exception {
        User first = saveWalletUser();
        first.setUsername("claimed");
        userRepository.save(first);

        User second = saveWalletUser();
        String secondToken = jwtService.generateToken(second.getId(), "SIGNER");

        mockMvc.perform(post("/api/users/me/username")
                        .header("Authorization", "Bearer " + secondToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"CLAIMED\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void availabilityEndpointReportsTakenAndAvailable() throws Exception {
        User first = saveWalletUser();
        first.setUsername("claimed_name");
        userRepository.save(first);

        User caller = saveWalletUser();
        String token = jwtService.generateToken(caller.getId(), "SIGNER");

        mockMvc.perform(get("/api/users/username-availability")
                        .header("Authorization", "Bearer " + token)
                        .param("username", "claimed_name"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available", is(false)));

        mockMvc.perform(get("/api/users/username-availability")
                        .header("Authorization", "Bearer " + token)
                        .param("username", "brand_new_name"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available", is(true)));
    }

    private User saveWalletUser() {
        User user = new User();
        user.setSuiAddress("0x" + UUID.randomUUID().toString().replace("-", "").substring(0, 32).repeat(2));
        user.setRole(Role.SIGNER);
        return userRepository.save(user);
    }
}
