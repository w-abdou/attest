package com.attest.attest.controller;

import com.attest.attest.dto.LoginRequest;
import com.attest.attest.dto.LoginResponse;
import com.attest.attest.dto.RegisterRequest;
import com.attest.attest.dto.UserResponse;
import com.attest.attest.model.User;
import com.attest.attest.service.JwtService;
import com.attest.attest.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        return ResponseEntity.ok(new UserResponse(user.getId(), user.getEmail(), user.getRole()));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        User user = userService.login(request);
        String token = jwtService.generateToken(user.getId(), user.getRole().name());
        return ResponseEntity.ok(new LoginResponse(user.getId(), user.getEmail(), user.getRole(), token));
    }
}