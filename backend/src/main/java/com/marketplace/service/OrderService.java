package com.marketplace.service;

import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.order.OrderRequestDto;
import com.marketplace.entity.FreelancerProfile;
import com.marketplace.entity.Order;
import com.marketplace.entity.OrderRequest;
import com.marketplace.entity.ServiceEntity;
import com.marketplace.entity.User;
import com.marketplace.enums.OrderStatus;
import com.marketplace.enums.RequestStatus;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.repository.FreelancerProfileRepository;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.OrderRequestRepository;
import com.marketplace.repository.ServiceRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderRequestRepository orderRequestRepository;
    private final UserRepository userRepository;
    private final ServiceRepository serviceRepository;
    private final FreelancerProfileRepository freelancerProfileRepository;

    public List<OrderRequestDto> getIncomingRequests(Long freelancerId) {
        return orderRequestRepository.findByService_Freelancer_User_Id(freelancerId)
                .stream()
                .map(this::mapToRequestDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void acceptRequest(Long requestId, Long freelancerId) {
        OrderRequest request = orderRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));
        if (!request.getService().getFreelancer().getUser().getId().equals(freelancerId)) {
            throw new UnauthorizedException("AccÃ¨s refusÃ©");
        }

        request.setStatus(RequestStatus.ACCEPTED);
        orderRequestRepository.save(request);

        Order order = Order.builder()
                .request(request)
                .service(request.getService())
                .client(request.getClient())
                .freelancer(request.getService().getFreelancer())
                .agreedPrice(request.getProposedBudget())
                .startDate(request.getProposedDate())
                .status(OrderStatus.IN_PROGRESS)
                .build();
        orderRepository.save(order);
    }

    @Transactional
    public void refuseRequest(Long requestId, Long freelancerId) {
        OrderRequest request = orderRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));
        if (!request.getService().getFreelancer().getUser().getId().equals(freelancerId)) {
            throw new UnauthorizedException("AccÃ¨s refusÃ©");
        }
        request.setStatus(RequestStatus.REJECTED);
        orderRequestRepository.save(request);
    }

    public List<OrderDto> getFreelancerOrders(Long freelancerId) {
        FreelancerProfile freelancer = freelancerProfileRepository.findByUserId(freelancerId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil freelance introuvable"));
        return orderRepository.findByFreelancer(freelancer)
                .stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrderRequestDto createOrderRequest(Long clientId, OrderRequestDto dto) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));
        ServiceEntity service = serviceRepository.findById(dto.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));

        if (orderRequestRepository.existsByClient_IdAndService(clientId, service)) {
            throw new BusinessException("Une demande existe dÃ©jÃ  pour ce service.", HttpStatus.CONFLICT);
        }

        OrderRequest request = OrderRequest.builder()
                .service(service)
                .client(client)
                .message(dto.getInitialMessage())
                .proposedBudget(dto.getProposedPrice())
                .proposedDate(dto.getCreatedAt() != null ? dto.getCreatedAt().toLocalDate() : null)
                .status(RequestStatus.PENDING)
                .build();

        return mapToRequestDto(orderRequestRepository.save(request));
    }

    public List<OrderDto> getClientOrders(Long clientId) {
        return orderRepository.findByClient_Id(clientId)
                .stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }

    private OrderRequestDto mapToRequestDto(OrderRequest request) {
        return OrderRequestDto.builder()
                .id(request.getId())
                .serviceId(request.getService().getId())
                .serviceTitle(request.getService().getTitle())
                .clientId(request.getClient().getId())
                .clientEmail(request.getClient().getEmail())
                .initialMessage(request.getMessage())
                .proposedPrice(request.getProposedBudget())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .build();
    }

    private OrderDto mapToOrderDto(Order order) {
        return OrderDto.builder()
                .id(order.getId())
                .serviceId(order.getService().getId())
                .serviceTitle(order.getService().getTitle())
                .clientId(order.getClient().getId())
                .clientEmail(order.getClient().getEmail())
                .freelancerId(order.getFreelancer().getUser().getId())
                .amount(order.getAgreedPrice())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .build();
    }
}
