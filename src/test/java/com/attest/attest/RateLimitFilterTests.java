package com.attest.attest;

import com.attest.attest.security.RateLimitFilter;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RateLimitFilterTests {

    @Test
    void sixthAuthRequestFromOneIpIsRejected() throws ServletException, IOException {
        RateLimitFilter filter = new RateLimitFilter();

        for (int requestNumber = 1; requestNumber <= 5; requestNumber++) {
            MockHttpServletRequest request = request("/api/auth/login");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertEquals(200, response.getStatus());
        }

        MockHttpServletResponse limitedResponse = new MockHttpServletResponse();
        filter.doFilter(request("/api/auth/login"), limitedResponse, new MockFilterChain());

        assertEquals(429, limitedResponse.getStatus());
    }

    private MockHttpServletRequest request(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr("192.0.2.10");
        return request;
    }
}
