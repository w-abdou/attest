package com.attest.attest.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI attestOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Attest API")
                        .description("Secure, tamper-evident document signing platform — Week 1 (pre-blockchain) endpoints")
                        .version("v0.1 (Week 1)"));
    }
}