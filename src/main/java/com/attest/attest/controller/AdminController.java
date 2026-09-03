package com.attest.attest.controller;

import com.attest.attest.dto.UpdateRoleRequest;
import com.attest.attest.dto.UserResponse;
import com.attest.attest.exception.ForbiddenException;
import com.attest.attest.model.User;
import com.attest.attest.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserService userService;

    public AdminController(UserService userService) {
        this.userService = userService;
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<UserResponse> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleRequest request,
            HttpServletRequest httpRequest
    ) {
        String requesterRole = (String) httpRequest.getAttribute("authenticatedRole");
        if (!"ADMIN".equals(requesterRole)) {
            throw new ForbiddenException("Only administrators can change user roles");
        }

        User updated = userService.updateRole(id, request.role());
        return ResponseEntity.ok(new UserResponse(updated.getId(), updated.getEmail(), updated.getRole()));
    }
}