package com.attest.attest;

import com.attest.attest.model.User;
import com.attest.attest.repository.UserRepository;
import com.attest.attest.service.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthSecurityIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    void registerLoginAndProtectedEndpointSecurity() throws Exception {
        String email = UUID.randomUUID() + "@example.com";
        String body = "{\"email\":\"" + email + "\",\"password\":\"password123\",\"role\":\"ADMIN\"}";
        String ip = "198.51.100.10";

        mockMvc.perform(post("/api/auth/register").with(remoteIp(ip))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("VIEWER")));

        mockMvc.perform(post("/api/auth/register").with(remoteIp(ip + "1"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/login").with(remoteIp(ip + "2"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());

        String token = jwtService.generateToken(
                userRepository.findByEmail(email).orElseThrow().getId(), "VIEWER");

        mockMvc.perform(multipart("/api/documents").with(remoteIp(ip + "3"))
                        .header("Authorization", "Bearer " + token)
                        .file(new MockMultipartFile("file", "document.pdf", "application/pdf", "%PDF-1.4\ncontent".getBytes())))
                .andExpect(status().isForbidden());
    }

    @Test
    void protectedEndpointRejectsMissingAndMalformedJwt() throws Exception {
        mockMvc.perform(post("/api/documents/1/verify").with(remoteIp("198.51.100.20")))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/documents/1/verify").with(remoteIp("198.51.100.21"))
                        .header("Authorization", "Bearer definitely-not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    private RequestPostProcessor remoteIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }
}
