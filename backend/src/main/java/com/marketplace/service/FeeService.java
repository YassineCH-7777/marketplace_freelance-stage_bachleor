package com.marketplace.service;

import com.marketplace.model.Fee;
import com.marketplace.model.Order;
import com.marketplace.persistence.FeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class FeeService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final FeeRepository feeRepository;

    @Value("${app.platform-fee-percentage:10}")
    private BigDecimal configuredPercentage;

    public Fee createForReleasedOrder(Order order) {
        if (order.getId() == null) {
            throw new IllegalArgumentException("La mission doit etre enregistree avant le calcul des frais.");
        }

        Fee existingFee = order.getFee();
        if (existingFee == null) {
            existingFee = feeRepository.findByOrder_Id(order.getId()).orElse(null);
        }
        if (existingFee != null) {
            order.setFee(existingFee);
            return existingFee;
        }

        BigDecimal percentage = normalizePercentage(configuredPercentage);
        BigDecimal totalAmount = order.getAgreedPrice().setScale(2, RoundingMode.HALF_UP);
        BigDecimal feeAmount = totalAmount
                .multiply(percentage)
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);

        Fee fee = Fee.builder()
                .order(order)
                .totalAmount(totalAmount)
                .feePercentage(percentage)
                .feeAmount(feeAmount)
                .freelancerAmount(totalAmount.subtract(feeAmount))
                .build();
        Fee savedFee = feeRepository.save(fee);
        order.setFee(savedFee);
        return savedFee;
    }

    private BigDecimal normalizePercentage(BigDecimal percentage) {
        BigDecimal normalized = percentage == null ? BigDecimal.TEN : percentage;
        if (normalized.signum() < 0 || normalized.compareTo(ONE_HUNDRED) > 0) {
            throw new IllegalStateException("Le pourcentage de commission doit etre compris entre 0 et 100.");
        }
        return normalized.setScale(2, RoundingMode.HALF_UP);
    }
}
