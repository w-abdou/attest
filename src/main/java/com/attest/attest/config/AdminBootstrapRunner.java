package com.attest.attest.config;

import com.attest.attest.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Runs once, automatically, right after the application starts. If
 * ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are set in the environment,
 * and no user with that email exists yet, this creates a single ADMIN account.
 * This is the only path in the whole application that can create an ADMIN — it is
 * never exposed through any HTTP endpoint, so a client can never trigger it.
 */
@Component
public class AdminBootstrapRunner implements CommandLineRunner {

    private final UserService userService;
    private final String bootstrapEmail;
    private final String bootstrapPassword;

    public AdminBootstrapRunner(
            UserService userService,
            @Value("${app.bootstrap.admin-email:}") String bootstrapEmail,
            @Value("${app.bootstrap.admin-password:}") String bootstrapPassword
    ) {
        this.userService = userService;
        this.bootstrapEmail = bootstrapEmail;
        this.bootstrapPassword = bootstrapPassword;
    }

    @Override
    public void run(String... args) {
        userService.bootstrapAdminIfConfigured(bootstrapEmail, bootstrapPassword);
    }
}