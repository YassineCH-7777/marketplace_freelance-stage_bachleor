package com.marketplace.service;

import com.marketplace.dto.order.OrderDto;
import com.marketplace.dto.order.OrderRequestDto;
import com.marketplace.entity.Order;
import com.marketplace.entity.OrderRequest;
import com.marketplace.entity.ServiceEntity;
import com.marketplace.entity.User;
import com.marketplace.enums.OrderStatus;
import com.marketplace.enums.RequestStatus;
import com.marketplace.repository.OrderRepository;
import com.marketplace.repository.OrderRequestRepository;
import com.marketplace.repository.ServiceRepository;
import com.marketplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.marketplace.exception.UnauthorizedException;
import com.marketplace.exception.ResourceNotFoundException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderRequestRepository orderRequestRepository;
    private final UserRepository userRepository;
    private final ServiceRepository serviceRepository;

    public List<OrderRequestDto> getIncomingRequests(Long freelancerId) {
        return orderRequestRepository.findByFreelancer_Id(freelancerId)
                .stream().map(this::mapToRequestDto).collect(Collectors.toList());
    }

    @Transactional
    public void acceptRequest(Long requestId, Long freelancerId) {
        OrderRequest request = orderRequestRepository.findById(requestId).orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));
        if (!request.getFreelancer().getId().equals(freelancerId)) {
            throw new UnauthorizedException("Accès refusé");
        }

        request.setStatus(RequestStatus.ACCEPTED);
        orderRequestRepository.save(request);

        // Crée automatiquement la commande (Order) à l'état EN COURS
        Order order = Order.builder()
                .service(request.getService())
                .client(request.getClient())
                .freelancer(request.getFreelancer())
                .amount(request.getProposedPrice())
                .status(OrderStatus.IN_PROGRESS)
                .build();
        orderRepository.save(order);
    }

    @Transactional
    public void refuseRequest(Long requestId, Long freelancerId) {
        OrderRequest request = orderRequestRepository.findById(requestId).orElseThrow(() -> new ResourceNotFoundException("Demande introuvable"));
        if (!request.getFreelancer().getId().equals(freelancerId)) {
            throw new UnauthorizedException("Accès refusé");
        }
        request.setStatus(RequestStatus.REJECTED);
        orderRequestRepository.save(request);
    }

    public List<OrderDto> getFreelancerOrders(Long freelancerId) {
        return orderRepository.findByFreelancer_Id(freelancerId)
                .stream().map(this::mapToOrderDto).collect(Collectors.toList());
    }

    private OrderRequestDto mapToRequestDto(OrderRequest r) {
        return OrderRequestDto.builder()
                .id(r.getId())
                .serviceId(r.getService().getId())
                .serviceTitle(r.getService().getTitle())
                .clientId(r.getClient().getId())
                .clientEmail(r.getClient().getEmail())
                .initialMessage(r.getInitialMessage())
                .proposedPrice(r.getProposedPrice())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private OrderDto mapToOrderDto(Order o) {
        return OrderDto.builder()
                .id(o.getId())
                .serviceId(o.getService().getId())
                .serviceTitle(o.getService().getTitle())
                .clientId(o.getClient().getId())
                .clientEmail(o.getClient().getEmail())
                .freelancerId(o.getFreelancer().getId())
                .amount(o.getAmount())
                .status(o.getStatus())
                .createdAt(o.getCreatedAt())
                .build();
    }

    // --- Client Logic ---

    @Transactional
    public OrderRequestDto createOrderRequest(Long clientId, OrderRequestDto dto) {
    User client = userRepository.findById(clientId).orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));
    ServiceEntity service = serviceRepository.findById(dto.getServiceId()).orElseThrow(() -> new ResourceNotFoundException("Service introuvable"));
        
        OrderRequest request = OrderRequest.builder()
                .service(service)
                .client(client)
                .freelancer(service.getFreelancer())
                .initialMessage(dto.getInitialMessage())
                .proposedPrice(dto.getProposedPrice())
                .status(RequestStatus.PENDING)
                .build();
                
        return mapToRequestDto(orderRequestRepository.save(request));
    }

    public List<OrderDto> getClientOrders(Long clientId) {
        return orderRepository.findByClient_Id(clientId)
                .stream().map(this::mapToOrderDto).collect(Collectors.toList());
    }
}
