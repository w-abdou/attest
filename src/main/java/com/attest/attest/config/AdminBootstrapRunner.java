package com.attest.attest.config;

import com.attest.attest.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Runs once, automatically, right after the application starts. If
 * ADMIN_BOOTSTRAP_SUI_ADDRESS is set in the environment, and no user with that
 * address exists yet, this pre-creates a single ADMIN account row for it. This
 * is the only path in the whole application that can create an ADMIN — it is
 * never exposed through any HTTP endpoint. Logging in as that address still
 * requires proving control of it through the normal wallet sign-in flow; this
 * only decides which role that login resolves to.
 */
@Component
public class AdminBootstrapRunner implements CommandLineRunner {

    private final UserService userService;
    private final String bootstrapSuiAddress;

    public AdminBootstrapRunner(
            UserService userService,
            @Value("${app.bootstrap.admin-sui-address:}") String bootstrapSuiAddress
    ) {
        this.userService = userService;
        this.bootstrapSuiAddress = bootstrapSuiAddress;
    }

    @Override
    public void run(String... args) {
        userService.bootstrapAdminIfConfigured(bootstrapSuiAddress);
    }
}
