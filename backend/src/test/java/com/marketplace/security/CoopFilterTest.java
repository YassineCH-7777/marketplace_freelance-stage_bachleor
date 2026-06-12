package com.marketplace.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class CoopFilterTest {

    @Test
    void addsSameOriginAllowPopupsHeader() throws Exception {
        CoopFilter filter = new CoopFilter();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader("Cross-Origin-Opener-Policy")).isEqualTo("same-origin-allow-popups");
    }
}
