package com.marketplace.application.service;

import com.marketplace.model.Fee;
import com.marketplace.model.Order;
import com.marketplace.persistence.FeeRepository;
import com.marketplace.service.FeeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeeServiceTest {

    @Mock
    private FeeRepository feeRepository;

    private FeeService feeService;

    @BeforeEach
    void setUp() {
        feeService = new FeeService(feeRepository);
        ReflectionTestUtils.setField(feeService, "configuredPercentage", new BigDecimal("10"));
    }

    @Test
    void calculatesTenPercentCommissionAndFreelancerNetAmount() {
        Order order = Order.builder().id(17L).agreedPrice(new BigDecimal("2000.00")).build();
        when(feeRepository.findByOrder_Id(17L)).thenReturn(Optional.empty());
        when(feeRepository.save(any(Fee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Fee fee = feeService.createForReleasedOrder(order);

        assertThat(fee.getTotalAmount()).isEqualByComparingTo("2000.00");
        assertThat(fee.getFeePercentage()).isEqualByComparingTo("10.00");
        assertThat(fee.getFeeAmount()).isEqualByComparingTo("200.00");
        assertThat(fee.getFreelancerAmount()).isEqualByComparingTo("1800.00");
        assertThat(order.getFee()).isSameAs(fee);
    }

    @Test
    void reusesExistingFeeToKeepCommissionCreationIdempotent() {
        Order order = Order.builder().id(17L).agreedPrice(new BigDecimal("2000.00")).build();
        Fee existing = Fee.builder().id(3L).order(order).feeAmount(new BigDecimal("200.00")).build();
        when(feeRepository.findByOrder_Id(17L)).thenReturn(Optional.of(existing));

        Fee fee = feeService.createForReleasedOrder(order);

        assertThat(fee).isSameAs(existing);
        verify(feeRepository, never()).save(any(Fee.class));
    }
}
