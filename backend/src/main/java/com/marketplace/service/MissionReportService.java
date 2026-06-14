package com.marketplace.service;

import com.marketplace.enums.MissionMilestoneStatus;
import com.marketplace.enums.OrderStatus;
import com.marketplace.enums.PaymentStatus;
import com.marketplace.model.Attachment;
import com.marketplace.model.Conversation;
import com.marketplace.model.Message;
import com.marketplace.model.MissionActivity;
import com.marketplace.model.MissionMilestone;
import com.marketplace.model.Order;
import com.marketplace.model.Proposal;
import com.marketplace.model.Review;
import com.marketplace.model.ServiceEntity;
import com.marketplace.model.ServiceRequest;
import com.marketplace.persistence.AttachmentRepository;
import com.marketplace.persistence.ConversationRepository;
import com.marketplace.persistence.MessageRepository;
import com.marketplace.persistence.MissionActivityRepository;
import com.marketplace.persistence.MissionMilestoneRepository;
import com.marketplace.persistence.OrderRepository;
import com.marketplace.persistence.ReviewRepository;
import com.marketplace.exception.BusinessException;
import com.marketplace.exception.ResourceNotFoundException;
import com.marketplace.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.function.Predicate;

@Service
@RequiredArgsConstructor
public class MissionReportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final OrderRepository orderRepository;
    private final MissionMilestoneRepository missionMilestoneRepository;
    private final MissionActivityRepository missionActivityRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AttachmentRepository attachmentRepository;
    private final ReviewRepository reviewRepository;

    @Transactional(readOnly = true)
    public byte[] generateMissionReport(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Commande introuvable"));
        ensureOrderParticipant(order, userId);

        List<MissionMilestone> milestones = safeList(
                missionMilestoneRepository.findByOrder_IdOrderBySortOrderAscCreatedAtAsc(orderId));
        List<MissionActivity> activities = safeList(
                missionActivityRepository.findByOrder_IdOrderByCreatedAtDesc(orderId))
                .stream()
                .filter(distinctByKey(activity -> activity.getTitle() + "|" + activity.getDetails()))
                .sorted(Comparator.comparing(MissionActivity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<Attachment> attachments = safeList(attachmentRepository.findByOrder_IdOrderByCreatedAtAsc(orderId));
        List<Message> allMessages = getMissionMessages(orderId);
        List<Message> importantMessages = allMessages.stream()
                .filter(Message::isImportant)
                .toList();
        Review review = reviewRepository.findByOrder_Id(orderId).orElse(null);

        try (PDDocument document = new PDDocument()) {
            PDDocumentInformation information = document.getDocumentInformation();
            information.setTitle("Rapport de mission #" + order.getId());
            information.setSubject(resolveMissionTitle(order));
            information.setAuthor("Marketplace Freelance");

            PdfReportWriter writer = new PdfReportWriter(document);
            writeReport(writer, order, milestones, activities, attachments, allMessages, importantMessages, review);
            return writer.save();
        } catch (IOException ex) {
            throw new BusinessException("Impossible de generer le rapport PDF.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private static <T> Predicate<T> distinctByKey(Function<T, ?> keyExtractor) {
        Set<Object> seen = ConcurrentHashMap.newKeySet();
        return value -> seen.add(keyExtractor.apply(value));
    }

    private void writeReport(
            PdfReportWriter writer,
            Order order,
            List<MissionMilestone> milestones,
            List<MissionActivity> activities,
            List<Attachment> attachments,
            List<Message> allMessages,
            List<Message> importantMessages,
            Review review
    ) throws IOException {
        writer.addHeader(
                "Rapport de mission",
                resolveMissionTitle(order),
                List.of(
                        "Mission: " + resolveMissionTitle(order),
                        "Categorie: " + resolveCategory(order),
                        "Ville: " + resolveCity(order),
                        "Mode: " + resolveExecutionMode(order),
                        "Reference: " + resolveOrderReference(order),
                        "Priorite: " + resolvePriority(order),
                        "Généré le " + formatDateTime(LocalDateTime.now()),
                        "Client: " + order.getClient().getEmail(),
                        "Freelance: " + order.getFreelancer().getUser().getEmail()
                ));

        writer.addMetricGrid(List.of(
                new ReportMetric("Statut", formatOrderStatus(order.getStatus())),
                new ReportMetric("Progression", safeProgress(order.getProgressPercentage()) + "%"),
                new ReportMetric("Montant", formatAmount(order.getAgreedPrice())),
                new ReportMetric("Paiement", formatPaymentStatus(order.getPaymentStatus()))
        ));
        writer.addProgressBar("Progression globale", safeProgress(order.getProgressPercentage()));

        writer.addSection("Résumé");
        writer.addDefinitionBlock("Objectif de la mission", resolveMissionObjective(order));
        writer.addChecklist("Livrables attendus", buildExpectedDeliverables(order));
        writer.addDefinitionBlock("Resultat final", resolveFinalResult(order));
        if (hasText(order.getNotes())) {
            writer.addDefinitionBlock("Suivi partage", order.getNotes());
        }

        writer.addSection("Avancement detaille");
        writer.addProgressTable(buildProgressRows(order));

        writer.addSection("Étapes");
        if (milestones.isEmpty()) {
            writer.addParagraph("Aucun jalon renseigne pour cette mission.");
        } else {
            for (MissionMilestone milestone : milestones) {
                writer.addMilestone(
                        milestone.getTitle(),
                        formatMilestoneStatus(milestone.getStatus()),
                        formatDate(milestone.getDeadline()),
                        formatAmount(milestone.getAmount()),
                        milestone.getDescription());
            }
        }

        writer.addSection("Dates clés");
        writer.addKeyValue("Création", formatDateTime(order.getCreatedAt()));
        writer.addKeyValue("Début", formatDate(order.getStartDate()));
        writer.addKeyValue("Échéance", formatDate(order.getDueDate()));
        writer.addKeyValue("Livraison", formatDateTime(order.getDeliveredAt()));
        writer.addKeyValue("Fin", formatDate(order.getEndDate()));
        writer.addKeyValue("Dernière mise à jour", formatDateTime(order.getUpdatedAt()));

        writer.addSection("Informations financieres");
        writer.addTable(
                List.of("Element", "Valeur"),
                buildFinanceRows(order)
        );
        Proposal proposal = order.getProposal();
        if (proposal != null) {
            writer.addKeyValue("Délai estimé", proposal.getEstimatedDays() + " jour(s)");
            if (hasText(proposal.getMessage())) {
                writer.addParagraph("Message de candidature: " + proposal.getMessage());
            }
        }

        writer.addSection("Indicateurs de performance");
        writer.addMetricGrid(List.of(
                new ReportMetric("Respect du delai", resolveDeadlineCompliance(order)),
                new ReportMetric("Revisions", String.valueOf(safeRevisionCount(order.getRevisionCount()))),
                new ReportMetric("Reponse moyenne", resolveAverageResponseTime(allMessages)),
                new ReportMetric("Satisfaction", review != null ? review.getRating() + "/5" : "Non evaluee")
        ));

        writer.addSection("Communication");
        writer.addTable(
                List.of("Indicateur", "Valeur"),
                buildCommunicationRows(allMessages, importantMessages)
        );
        if (!importantMessages.isEmpty()) {
            writer.addDefinitionBlock("Messages importants", "Messages marques comme preuves ou validations dans la conversation.");
            for (Message message : importantMessages) {
                writer.addTimelineItem(
                        formatDateTime(message.getCreatedAt()),
                        message.getSender().getEmail(),
                        message.getContent());
            }
        }

        writer.addSection("Competences et technologies");
        writer.addChecklist("Technologies utilisees", buildTechnologyItems(order));

        writer.addSection("Livrables livres");
        writer.addChecklist("Livrables", buildDeliveredItems(order, attachments));

        writer.addSection("Livraison finale");
        writer.addKeyValue("Statut de livraison", formatOrderStatus(order.getStatus()));
        writer.addKeyValue("Livree le", formatDateTime(order.getDeliveredAt()));
        writer.addParagraph(hasText(order.getDeliveryNote())
                ? order.getDeliveryNote()
                : "Aucune note de livraison finale n'a encore été partagée.");
        if (hasText(order.getRevisionRequest())) {
            writer.addParagraph("Révision demandée: " + order.getRevisionRequest());
        }
        if (attachments.isEmpty()) {
            writer.addParagraph("Aucun fichier de livraison rattaché à cette mission.");
        } else {
            writer.addParagraph("Fichiers livrés:");
            for (Attachment attachment : attachments) {
                writer.addBullet(attachment.getOriginalFileName() + " - " + attachment.getAttachmentType()
                        + " - " + formatDateTime(attachment.getCreatedAt()));
            }
        }

        writer.addSection("Signature numerique");
        writer.addSignatureBlock(
                "Client",
                order.getStatus() == OrderStatus.COMPLETED ? "Mission validee" : "Validation en attente",
                "Freelance",
                isDeliveryPerformed(order) ? "Livraison effectuee" : "Livraison en attente",
                resolveClosingDate(order)
        );

        if (hasText(order.getDisputeReason())) {
            writer.addSection("Litige");
            writer.addStatusPill("Litige ouvert", 0.99f, 0.93f, 0.93f, 0.70f, 0.10f, 0.10f);
            writer.addKeyValue("Ouvert le", formatDateTime(order.getDisputeOpenedAt()));
            writer.addKeyValue("Ouvert par", order.getDisputeOpenedBy() != null ? order.getDisputeOpenedBy().getEmail() : "-");
            writer.addParagraph("Motif: " + order.getDisputeReason());
            if (hasText(order.getDisputeAdminNotes())) {
                writer.addParagraph("Arbitrage admin: " + order.getDisputeAdminNotes());
            }
            if (hasText(order.getDisputeResolution())) {
                writer.addKeyValue("Décision", order.getDisputeResolution());
                writer.addKeyValue("Résolution", formatDateTime(order.getDisputeResolvedAt()));
            }
        }

        writer.addSection("Timeline graphique");
        writer.addGraphicTimeline(buildTimelineSteps(order, milestones, activities));

        if (review != null) {
            writer.addSection("Evaluation detaillee");
            writer.addTable(
                    List.of("Critere", "Note"),
                    buildReviewRows(review)
            );
            if (hasText(review.getComment())) {
                writer.addDefinitionBlock("Commentaire client", review.getComment());
            }
        }
    }

    private List<Message> getMissionMessages(Long orderId) {
        Optional<Conversation> conversation = conversationRepository.findByOrder_Id(orderId);
        return conversation
                .map(value -> safeList(messageRepository.findByConversation_IdOrderByCreatedAtAsc(value.getId())))
                .orElseGet(List::of);
    }

    private void ensureOrderParticipant(Order order, Long userId) {
        boolean isClient = order.getClient().getId().equals(userId);
        boolean isFreelancer = order.getFreelancer().getUser().getId().equals(userId);
        if (!isClient && !isFreelancer) {
            throw new UnauthorizedException("Acces refuse");
        }
    }

    private String resolveMissionTitle(Order order) {
        ServiceEntity service = order.getService();
        if (service != null && hasText(service.getTitle())) {
            return service.getTitle();
        }
        Proposal proposal = order.getProposal();
        if (proposal != null && proposal.getServiceRequest() != null && hasText(proposal.getServiceRequest().getTitle())) {
            return proposal.getServiceRequest().getTitle();
        }
        return "Mission #" + order.getId();
    }

    private String resolveInitialBrief(Order order) {
        if (order.getRequest() != null && hasText(order.getRequest().getMessage())) {
            return "Brief initial: " + order.getRequest().getMessage();
        }

        Proposal proposal = order.getProposal();
        if (proposal != null) {
            ServiceRequest serviceRequest = proposal.getServiceRequest();
            if (serviceRequest != null && hasText(serviceRequest.getDescription())) {
                return "Brief initial: " + serviceRequest.getDescription();
            }
            if (hasText(proposal.getMessage())) {
                return "Brief initial: " + proposal.getMessage();
            }
        }

        ServiceEntity service = order.getService();
        if (service != null && hasText(service.getDescription())) {
            return "Brief initial: " + service.getDescription();
        }

        return "Brief initial non renseigne.";
    }

    private String resolveCategory(Order order) {
        ServiceEntity service = order.getService();
        if (service != null && service.getCategory() != null && hasText(service.getCategory().getName())) {
            return service.getCategory().getName();
        }

        ServiceRequest serviceRequest = resolveServiceRequest(order);
        if (serviceRequest != null && serviceRequest.getCategory() != null && hasText(serviceRequest.getCategory().getName())) {
            return serviceRequest.getCategory().getName();
        }

        return "Non renseignee";
    }

    private String resolveCity(Order order) {
        ServiceEntity service = order.getService();
        if (service != null && hasText(service.getCity())) {
            return service.getCity();
        }

        ServiceRequest serviceRequest = resolveServiceRequest(order);
        if (serviceRequest != null && hasText(serviceRequest.getCity())) {
            return serviceRequest.getCity();
        }

        return "A distance";
    }

    private String resolveExecutionMode(Order order) {
        ServiceEntity service = order.getService();
        if (service != null) {
            if (service.isRemote() && hasText(service.getCity()) && !"remote".equalsIgnoreCase(service.getCity())) {
                return "Hybride";
            }
            return service.isRemote() ? "Distance" : "Local";
        }

        ServiceRequest serviceRequest = resolveServiceRequest(order);
        if (serviceRequest != null) {
            if (serviceRequest.isRemote() && hasText(serviceRequest.getCity())) {
                return "Hybride";
            }
            return serviceRequest.isRemote() ? "Distance" : "Local";
        }

        return "A confirmer";
    }

    private String resolveOrderReference(Order order) {
        int year = order.getCreatedAt() != null ? order.getCreatedAt().getYear() : LocalDate.now().getYear();
        long id = order.getId() != null ? order.getId() : 0L;
        return "ORD-" + year + "-" + String.format("%04d", id);
    }

    private String resolvePriority(Order order) {
        ServiceRequest serviceRequest = resolveServiceRequest(order);
        if (serviceRequest != null && serviceRequest.isUrgent()) {
            return "Urgente";
        }
        if (order.getDueDate() != null && !order.getDueDate().isAfter(LocalDate.now().plusDays(3))) {
            return "Haute";
        }
        return "Normale";
    }

    private ServiceRequest resolveServiceRequest(Order order) {
        Proposal proposal = order.getProposal();
        if (proposal != null && proposal.getServiceRequest() != null) {
            return proposal.getServiceRequest();
        }
        return null;
    }

    private String resolveMissionObjective(Order order) {
        String brief = resolveInitialBrief(order).replaceFirst("(?i)^brief initial:\\s*", "").trim();
        if (hasText(brief) && !"Brief initial non renseigne.".equals(brief)) {
            return brief;
        }

        ServiceEntity service = order.getService();
        if (service != null && hasText(service.getShortDescription())) {
            return service.getShortDescription();
        }
        if (service != null && hasText(service.getDescription())) {
            return service.getDescription();
        }

        return "Realiser la mission conformement au besoin client et aux livrables convenus.";
    }

    private List<String> buildExpectedDeliverables(Order order) {
        LinkedHashSet<String> deliverables = new LinkedHashSet<>();
        Proposal proposal = order.getProposal();
        if (proposal != null) {
            safeList(proposal.getProposedSteps()).stream()
                    .filter(this::hasText)
                    .forEach(deliverables::add);
        }

        String searchable = (resolveMissionTitle(order) + " " + resolveMissionObjective(order) + " " + resolveCategory(order)).toLowerCase();
        if (searchable.contains("site") || searchable.contains("web") || searchable.contains("restaurant")) {
            deliverables.add("Page d'accueil");
            deliverables.add("Presentation du restaurant ou de l'activite");
            deliverables.add("Galerie photos");
            deliverables.add("Formulaire de contact ou reservation");
            deliverables.add("Responsive mobile");
        }

        if (deliverables.isEmpty()) {
            milestonesToDeliverables(order).forEach(deliverables::add);
        }
        if (deliverables.isEmpty()) {
            deliverables.add("Livrable final valide par le client");
        }

        return new ArrayList<>(deliverables);
    }

    private List<String> milestonesToDeliverables(Order order) {
        if (order.getId() == null) {
            return List.of();
        }
        return safeList(missionMilestoneRepository.findByOrder_IdOrderBySortOrderAscCreatedAtAsc(order.getId()))
                .stream()
                .map(MissionMilestone::getTitle)
                .filter(this::hasText)
                .toList();
    }

    private String resolveFinalResult(Order order) {
        return switch (order.getStatus()) {
            case COMPLETED -> "Projet livre et valide avec succes.";
            case DELIVERED, WAITING_CLIENT -> "Projet livre, validation client en attente.";
            case DISPUTED -> "Projet en litige, decision finale en attente.";
            case CANCELLED -> "Mission annulee.";
            case REVISION -> "Livraison en revision apres retour client.";
            default -> "Mission en cours d'execution.";
        };
    }

    private List<ProgressRow> buildProgressRows(Order order) {
        int progress = Math.max(0, Math.min(100, safeProgress(order.getProgressPercentage())));
        if (order.getStatus() == OrderStatus.COMPLETED) {
            progress = 100;
        }
        return List.of(
                new ProgressRow("Analyse", stageProgress(progress, 15, 30)),
                new ProgressRow("Design", stageProgress(progress, 30, 50)),
                new ProgressRow("Developpement", stageProgress(progress, 50, 80)),
                new ProgressRow("Tests", stageProgress(progress, 80, 95)),
                new ProgressRow("Livraison", stageProgress(progress, 90, 100))
        );
    }

    private int stageProgress(int globalProgress, int start, int end) {
        if (globalProgress >= end) {
            return 100;
        }
        if (globalProgress <= start) {
            return 0;
        }
        return Math.round((globalProgress - start) * 100f / (end - start));
    }

    private List<List<String>> buildFinanceRows(Order order) {
        return List.of(
                List.of("Budget initial", formatAmount(resolveInitialBudget(order))),
                List.of("Budget final", formatAmount(order.getAgreedPrice())),
                List.of("Revisions", String.valueOf(safeRevisionCount(order.getRevisionCount()))),
                List.of("Paiement", formatPaymentStatus(order.getPaymentStatus()))
        );
    }

    private BigDecimal resolveInitialBudget(Order order) {
        if (order.getRequest() != null && order.getRequest().getProposedBudget() != null) {
            return order.getRequest().getProposedBudget();
        }
        Proposal proposal = order.getProposal();
        if (proposal != null && proposal.getProposedPrice() != null) {
            return proposal.getProposedPrice();
        }
        return order.getAgreedPrice();
    }

    private String resolveDeadlineCompliance(Order order) {
        if (order.getDueDate() == null) {
            return "A confirmer";
        }
        LocalDate deliveredDate = order.getDeliveredAt() != null
                ? order.getDeliveredAt().toLocalDate()
                : order.getEndDate();
        if (deliveredDate == null && order.getStatus() == OrderStatus.COMPLETED) {
            deliveredDate = LocalDate.now();
        }
        if (deliveredDate == null) {
            return LocalDate.now().isAfter(order.getDueDate()) ? "En retard" : "En cours";
        }
        return deliveredDate.isAfter(order.getDueDate()) ? "Hors delai" : "100%";
    }

    private String resolveAverageResponseTime(List<Message> messages) {
        List<Message> datedMessages = safeList(messages)
                .stream()
                .filter(message -> message.getCreatedAt() != null && message.getSender() != null)
                .sorted(Comparator.comparing(Message::getCreatedAt))
                .toList();
        if (datedMessages.size() < 2) {
            return "Non disponible";
        }

        long totalMinutes = 0;
        int exchanges = 0;
        for (int index = 1; index < datedMessages.size(); index += 1) {
            Message previous = datedMessages.get(index - 1);
            Message current = datedMessages.get(index);
            if (!previous.getSender().getId().equals(current.getSender().getId())) {
                totalMinutes += Math.max(0, Duration.between(previous.getCreatedAt(), current.getCreatedAt()).toMinutes());
                exchanges += 1;
            }
        }
        if (exchanges == 0) {
            return "Non disponible";
        }
        long averageMinutes = Math.max(1, totalMinutes / exchanges);
        if (averageMinutes < 60) {
            return averageMinutes + " min";
        }
        return Math.round(averageMinutes / 60f) + "h";
    }

    private List<List<String>> buildCommunicationRows(List<Message> allMessages, List<Message> importantMessages) {
        Optional<Message> lastMessage = safeList(allMessages)
                .stream()
                .filter(message -> message.getCreatedAt() != null)
                .max(Comparator.comparing(Message::getCreatedAt));
        return List.of(
                List.of("Messages echanges", String.valueOf(safeList(allMessages).size())),
                List.of("Messages importants", String.valueOf(safeList(importantMessages).size())),
                List.of("Dernier echange", lastMessage.map(message -> formatDateTime(message.getCreatedAt())).orElse("Aucun message")),
                List.of("Temps de reponse moyen", resolveAverageResponseTime(allMessages))
        );
    }

    private List<String> buildTechnologyItems(Order order) {
        LinkedHashSet<String> items = new LinkedHashSet<>();
        ServiceRequest serviceRequest = resolveServiceRequest(order);
        if (serviceRequest != null) {
            safeList(serviceRequest.getRequiredSkills()).stream()
                    .filter(this::hasText)
                    .forEach(items::add);
        }

        String searchable = (resolveMissionTitle(order) + " " + resolveCategory(order) + " " + resolveMissionObjective(order)).toLowerCase();
        if (searchable.contains("web") || searchable.contains("site") || searchable.contains("developpement") || searchable.contains("développement")) {
            items.add("React");
            items.add("Spring Boot");
            items.add("PostgreSQL");
            items.add("Git");
            items.add("Docker");
        }
        if (items.isEmpty()) {
            items.add("Cadrage projet");
            items.add("Communication client");
            items.add("Suivi de livraison");
        }
        return new ArrayList<>(items);
    }

    private List<String> buildDeliveredItems(Order order, List<Attachment> attachments) {
        LinkedHashSet<String> items = new LinkedHashSet<>();
        safeList(attachments).stream()
                .map(Attachment::getOriginalFileName)
                .filter(this::hasText)
                .forEach(items::add);
        if (items.isEmpty() && hasText(order.getDeliveryNote())) {
            items.add("Livraison documentee dans la note finale");
        }
        if (items.isEmpty() && order.getStatus() == OrderStatus.COMPLETED) {
            items.add("Livrable final valide par le client");
        }
        if (items.isEmpty()) {
            items.add("Aucun fichier de livraison attache");
        }
        return new ArrayList<>(items);
    }

    private boolean isDeliveryPerformed(Order order) {
        return order.getDeliveredAt() != null
                || order.getStatus() == OrderStatus.DELIVERED
                || order.getStatus() == OrderStatus.WAITING_CLIENT
                || order.getStatus() == OrderStatus.COMPLETED;
    }

    private String resolveClosingDate(Order order) {
        if (order.getEndDate() != null) {
            return formatDate(order.getEndDate());
        }
        if (order.getDeliveredAt() != null) {
            return formatDateTime(order.getDeliveredAt());
        }
        return "A confirmer";
    }

    private List<TimelineStep> buildTimelineSteps(
            Order order,
            List<MissionMilestone> milestones,
            List<MissionActivity> activities
    ) {
        ArrayList<TimelineStep> steps = new ArrayList<>();
        steps.add(new TimelineStep("Mission creee", formatDateTime(order.getCreatedAt()), "Commande initialisee", true));

        for (MissionMilestone milestone : safeList(milestones)) {
            boolean completed = milestone.getStatus() == MissionMilestoneStatus.COMPLETED;
            boolean active = milestone.getStatus() == MissionMilestoneStatus.IN_PROGRESS
                    || milestone.getStatus() == MissionMilestoneStatus.WAITING_CLIENT;
            steps.add(new TimelineStep(
                    milestone.getTitle(),
                    formatDate(milestone.getDeadline()),
                    formatMilestoneStatus(milestone.getStatus()),
                    completed || active));
        }

        if (isDeliveryPerformed(order)) {
            steps.add(new TimelineStep("Livraison effectuee", formatDateTime(order.getDeliveredAt()), "Livrable transmis au client", true));
        }
        if (order.getStatus() == OrderStatus.COMPLETED) {
            steps.add(new TimelineStep("Validation client", resolveClosingDate(order), "Mission validee et paiement libere", true));
        }
        if (hasText(order.getDisputeReason())) {
            steps.add(new TimelineStep("Litige ouvert", formatDateTime(order.getDisputeOpenedAt()), order.getDisputeReason(), true));
        }

        if (steps.size() == 1) {
            safeList(activities).stream()
                    .limit(5)
                    .forEach(activity -> steps.add(new TimelineStep(
                            activity.getTitle(),
                            formatDateTime(activity.getCreatedAt()),
                            activity.getDetails(),
                            true)));
        }
        return steps;
    }

    private List<List<String>> buildReviewRows(Review review) {
        return List.of(
                List.of("Qualite", formatStars(review.getQualityRating(), review.getRating())),
                List.of("Communication", formatStars(review.getCommunicationRating(), review.getRating())),
                List.of("Respect des delais", formatStars(review.getPunctualityRating(), review.getRating())),
                List.of("Rapport qualite/prix", formatStars(review.getRating(), review.getRating()))
        );
    }

    private String formatStars(Integer value, Integer fallback) {
        int rating = value != null ? value : (fallback != null ? fallback : 0);
        rating = Math.max(0, Math.min(5, rating));
        return "*".repeat(rating) + "-".repeat(5 - rating) + " " + rating + "/5";
    }

    private String formatOrderStatus(OrderStatus status) {
        if (status == null) {
            return "Inconnu";
        }
        return switch (status) {
            case PENDING -> "En attente";
            case ACCEPTED -> "Validee";
            case IN_PROGRESS -> "En cours";
            case WAITING_CLIENT -> "En attente client";
            case DELIVERED -> "Livree";
            case REVISION -> "Revision";
            case COMPLETED -> "Terminee";
            case CANCELLED -> "Annulee";
            case DISPUTED -> "Litige";
        };
    }

    private String formatPaymentStatus(PaymentStatus status) {
        if (status == null) {
            return "Inconnu";
        }
        return switch (status) {
            case UNPAID -> "Non paye";
            case PENDING -> "Paiement en attente";
            case HELD -> "Paiement bloque en escrow simule";
            case PAID -> "Paiement libere";
            case RELEASED -> "Paiement libere";
            case REFUNDED -> "Rembourse";
        };
    }

    private String formatMilestoneStatus(MissionMilestoneStatus status) {
        if (status == null) {
            return "A faire";
        }
        return switch (status) {
            case PENDING -> "A faire";
            case IN_PROGRESS -> "En cours";
            case WAITING_CLIENT -> "En attente client";
            case COMPLETED -> "Termine";
            case CANCELLED -> "Annule";
        };
    }

    private String formatDate(LocalDate value) {
        return value != null ? value.format(DATE_FORMATTER) : "A confirmer";
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? value.format(DATE_TIME_FORMATTER) : "A confirmer";
    }

    private String formatAmount(BigDecimal value) {
        return value != null ? value.toPlainString() + " MAD" : "0 MAD";
    }

    private int safeProgress(Integer value) {
        return value != null ? value : 0;
    }

    private int safeRevisionCount(Integer value) {
        return value != null ? Math.max(value, 0) : 0;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private <T> List<T> safeList(List<T> values) {
        return values != null ? values : List.of();
    }

    private record ReportMetric(String label, String value) {
    }

    private record ProgressRow(String label, int progress) {
    }

    private record TimelineStep(String title, String date, String details, boolean done) {
    }

    private static class PdfReportWriter {
        private static final PDFont FONT_REGULAR = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        private static final PDFont FONT_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        private static final float MARGIN = 8f;
        private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
        private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
        private static final float CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
        private static final float TOP_PADDING = 12f;
        private static final float FOOTER_HEIGHT = 38f;
        private static final float PRIMARY_R = 0.02f;
        private static final float PRIMARY_G = 0.18f;
        private static final float PRIMARY_B = 0.30f;
        private static final float ACCENT_R = 0.00f;
        private static final float ACCENT_G = 0.50f;
        private static final float ACCENT_B = 0.67f;
        private static final float TEXT_R = 0.05f;
        private static final float TEXT_G = 0.13f;
        private static final float TEXT_B = 0.22f;
        private static final float MUTED_R = 0.36f;
        private static final float MUTED_G = 0.45f;
        private static final float MUTED_B = 0.55f;
        private static final float BORDER_R = 0.81f;
        private static final float BORDER_G = 0.88f;
        private static final float BORDER_B = 0.92f;

        private final PDDocument document;
        private PDPageContentStream content;
        private int pageNumber = 0;
        private float y;

        PdfReportWriter(PDDocument document) throws IOException {
            this.document = document;
            addPage();
        }

        void addHeader(String title, String subtitle, List<String> metaItems) throws IOException {
            float textX = MARGIN + 24f;
            float maxSubtitleWidth = CONTENT_WIDTH - 48f;
            List<String> subtitleLines = wrap(subtitle, FONT_REGULAR, 11.5f, maxSubtitleWidth).stream()
                    .limit(2)
                    .toList();

            // Pre-compute how many chip rows are needed so the header box can size itself.
            int chipRows = estimateChipRows(metaItems, textX);
            float baseHeight = 78f + subtitleLines.size() * 14f;
            float chipAreaHeight = chipRows * 18f + 6f;
            float headerHeight = baseHeight + chipAreaHeight;

            ensureSpace(headerHeight + TOP_PADDING + 6f);
            drawFilledRect(MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, PRIMARY_R, PRIMARY_G, PRIMARY_B);
            drawFilledRect(MARGIN, y - headerHeight, 6f, headerHeight, ACCENT_R, ACCENT_G, ACCENT_B);

            float textY = y - 28f;
            writeTextAt("Marketplace Freelance", FONT_BOLD, 8.5f, textX, textY, 0.70f, 0.86f, 0.95f);
            textY -= 24f;
            writeTextAt(title, FONT_BOLD, 25f, textX, textY, 1f, 1f, 1f);
            textY -= 20f;

            for (String line : subtitleLines) {
                writeTextAt(line, FONT_REGULAR, 11.5f, textX, textY, 0.86f, 0.93f, 0.98f);
                textY -= 14f;
            }

            float chipX = textX;
            float chipY = y - headerHeight + 18f;
            for (String item : metaItems) {
                String chipText = sanitizeText(emptyFallback(item));
                float chipWidth = Math.min(220f, stringWidth(chipText, FONT_BOLD, 8.5f) + 18f);
                if (chipX + chipWidth > PAGE_WIDTH - MARGIN - 12f) {
                    chipX = textX;
                    chipY += 18f;
                }
                drawFilledRect(chipX, chipY - 9f, chipWidth, 16f, 0.08f, 0.28f, 0.43f);
                writeTextAt(chipText, FONT_BOLD, 8.5f, chipX + 8f, chipY - 4f, 0.86f, 0.95f, 1f);
                chipX += chipWidth + 6f;
            }

            y -= headerHeight + 18f;
        }

        private int estimateChipRows(List<String> metaItems, float startX) throws IOException {
            float chipX = startX;
            int rows = 1;
            for (String item : metaItems) {
                String chipText = sanitizeText(emptyFallback(item));
                float chipWidth = Math.min(220f, stringWidth(chipText, FONT_BOLD, 8.5f) + 18f);
                if (chipX + chipWidth > PAGE_WIDTH - MARGIN - 12f) {
                    chipX = startX;
                    rows += 1;
                }
                chipX += chipWidth + 6f;
            }
            return rows;
        }

        void addMetricGrid(List<ReportMetric> metrics) throws IOException {
            if (metrics == null || metrics.isEmpty()) {
                return;
            }

            int columns = Math.min(4, metrics.size());
            float gap = 8f;
            float cardWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
            float cardHeight = 58f;
            ensureSpace(cardHeight + 16f);

            float startY = y;
            for (int index = 0; index < metrics.size(); index += 1) {
                int column = index % columns;
                if (column == 0 && index > 0) {
                    y -= cardHeight + gap;
                    startY = y;
                    ensureSpace(cardHeight + 16f);
                }

                ReportMetric metric = metrics.get(index);
                float x = MARGIN + column * (cardWidth + gap);
                drawCard(x, startY - cardHeight, cardWidth, cardHeight);
                writeTextAt(metric.label(), FONT_BOLD, 8f, x + 12f, startY - 17f, MUTED_R, MUTED_G, MUTED_B);
                List<String> valueLines = wrap(metric.value(), FONT_BOLD, 12.5f, cardWidth - 24f);
                float valueY = startY - 36f;
                for (String line : valueLines.stream().limit(2).toList()) {
                    writeTextAt(line, FONT_BOLD, 12.5f, x + 12f, valueY, TEXT_R, TEXT_G, TEXT_B);
                    valueY -= 14f;
                }
            }

            y = startY - cardHeight - 14f;
        }

        void addProgressBar(String label, int progress) throws IOException {
            float blockHeight = 42f;
            ensureSpace(blockHeight + 10f);
            int safeProgress = Math.max(0, Math.min(100, progress));
            writeTextAt(label, FONT_BOLD, 9f, MARGIN, y, MUTED_R, MUTED_G, MUTED_B);
            writeTextAt(safeProgress + "%", FONT_BOLD, 9f, PAGE_WIDTH - MARGIN - 28f, y, ACCENT_R, ACCENT_G, ACCENT_B);
            y -= 15f;

            float barHeight = 8f;
            drawFilledRect(MARGIN, y, CONTENT_WIDTH, barHeight, 0.88f, 0.93f, 0.96f);
            drawFilledRect(MARGIN, y, CONTENT_WIDTH * safeProgress / 100f, barHeight, ACCENT_R, ACCENT_G, ACCENT_B);
            y -= 22f;
        }

        void addSection(String value) throws IOException {
            ensureSpace(46f);
            y -= 8f;
            drawFilledRect(MARGIN, y - 18f, 4f, 18f, ACCENT_R, ACCENT_G, ACCENT_B);
            writeTextAt(value, FONT_BOLD, 15f, MARGIN + 12f, y - 14f, TEXT_R, TEXT_G, TEXT_B);
            y -= 30f;
        }

        void addDefinitionBlock(String title, String value) throws IOException {
            List<String> lines = wrap(value, FONT_REGULAR, 10.2f, CONTENT_WIDTH - 30f);
            float boxHeight = Math.max(54f, 33f + lines.size() * 13f);
            ensureSpace(boxHeight + 8f);

            drawCard(MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight);
            drawFilledRect(MARGIN, y - boxHeight, 5f, boxHeight, ACCENT_R, ACCENT_G, ACCENT_B);
            writeTextAt(title, FONT_BOLD, 10.6f, MARGIN + 14f, y - 16f, TEXT_R, TEXT_G, TEXT_B);

            float textY = y - 34f;
            for (String line : lines) {
                writeTextAt(line, FONT_REGULAR, 10.2f, MARGIN + 14f, textY, MUTED_R, MUTED_G, MUTED_B);
                textY -= 13f;
            }
            y -= boxHeight + 7f;
        }

        void addChecklist(String title, List<String> items) throws IOException {
            List<String> safeItems = items == null || items.isEmpty() ? List.of("Non renseigne") : items;
            java.util.ArrayList<List<String>> wrappedItems = new java.util.ArrayList<>();
            for (String item : safeItems) {
                wrappedItems.add(wrap(item, FONT_REGULAR, 10f, CONTENT_WIDTH - 42f));
            }

            float boxHeight = 28f;
            for (List<String> lines : wrappedItems) {
                boxHeight += Math.max(18f, lines.size() * 12.5f + 4f);
            }
            ensureSpace(boxHeight + 8f);

            drawCard(MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight);
            writeTextAt(title, FONT_BOLD, 10.6f, MARGIN + 14f, y - 16f, TEXT_R, TEXT_G, TEXT_B);

            float cursorY = y - 35f;
            for (List<String> lines : wrappedItems) {
                drawFilledRect(MARGIN + 16f, cursorY - 7f, 6f, 6f, ACCENT_R, ACCENT_G, ACCENT_B);
                float textY = cursorY - 3f;
                for (String line : lines) {
                    writeTextAt(line, FONT_REGULAR, 10f, MARGIN + 30f, textY, MUTED_R, MUTED_G, MUTED_B);
                    textY -= 12.5f;
                }
                cursorY -= Math.max(18f, lines.size() * 12.5f + 4f);
            }
            y -= boxHeight + 7f;
        }

        void addTable(List<String> headers, List<List<String>> rows) throws IOException {
            List<String> safeHeaders = headers == null || headers.isEmpty() ? List.of("Element", "Valeur") : headers;
            List<List<String>> safeRows = rows == null || rows.isEmpty() ? List.of(List.of("Aucune donnee", "Non renseigne")) : rows;
            int columns = Math.max(1, safeHeaders.size());
            float[] widths = columnWidths(columns);

            float headerHeight = 24f;
            java.util.ArrayList<Float> rowHeights = new java.util.ArrayList<>();
            java.util.ArrayList<List<List<String>>> wrappedRows = new java.util.ArrayList<>();
            for (List<String> row : safeRows) {
                java.util.ArrayList<List<String>> wrappedCells = new java.util.ArrayList<>();
                int maxLines = 1;
                for (int column = 0; column < columns; column += 1) {
                    String cell = column < row.size() ? row.get(column) : "";
                    List<String> lines = wrap(cell, FONT_REGULAR, 9.6f, widths[column] - 18f);
                    wrappedCells.add(lines);
                    maxLines = Math.max(maxLines, lines.size());
                }
                wrappedRows.add(wrappedCells);
                rowHeights.add(Math.max(24f, maxLines * 12f + 12f));
            }

            float tableHeight = headerHeight;
            for (Float rowHeight : rowHeights) {
                tableHeight += rowHeight;
            }
            ensureSpace(tableHeight + 8f);

            float topY = y;
            drawFilledRect(MARGIN, topY - headerHeight, CONTENT_WIDTH, headerHeight, PRIMARY_R, PRIMARY_G, PRIMARY_B);
            float cursorX = MARGIN;
            for (int column = 0; column < columns; column += 1) {
                String header = column < safeHeaders.size() ? safeHeaders.get(column) : "";
                writeTextAt(header, FONT_BOLD, 9.2f, cursorX + 9f, topY - 15f, 1f, 1f, 1f);
                cursorX += widths[column];
            }

            float cursorY = topY - headerHeight;
            for (int rowIndex = 0; rowIndex < wrappedRows.size(); rowIndex += 1) {
                float rowHeight = rowHeights.get(rowIndex);
                drawFilledRect(MARGIN, cursorY - rowHeight, CONTENT_WIDTH, rowHeight, 1f, 1f, 1f);
                drawStrokeRect(MARGIN, cursorY - rowHeight, CONTENT_WIDTH, rowHeight, BORDER_R, BORDER_G, BORDER_B);

                cursorX = MARGIN;
                for (int column = 0; column < columns; column += 1) {
                    List<String> lines = wrappedRows.get(rowIndex).get(column);
                    float textY = cursorY - 13f;
                    PDFont font = column == 0 ? FONT_BOLD : FONT_REGULAR;
                    float textR = column == 0 ? TEXT_R : MUTED_R;
                    float textG = column == 0 ? TEXT_G : MUTED_G;
                    float textB = column == 0 ? TEXT_B : MUTED_B;
                    for (String line : lines) {
                        writeTextAt(line, font, 9.6f, cursorX + 9f, textY, textR, textG, textB);
                        textY -= 12f;
                    }
                    cursorX += widths[column];
                    if (column < columns - 1) {
                        content.setStrokingColor(BORDER_R, BORDER_G, BORDER_B);
                        content.setLineWidth(0.6f);
                        content.moveTo(cursorX, cursorY);
                        content.lineTo(cursorX, cursorY - rowHeight);
                        content.stroke();
                    }
                }
                cursorY -= rowHeight;
            }
            y = cursorY - 8f;
        }

        void addProgressTable(List<ProgressRow> rows) throws IOException {
            List<ProgressRow> safeRows = rows == null || rows.isEmpty() ? List.of(new ProgressRow("Avancement", 0)) : rows;
            float rowHeight = 26f;
            float boxHeight = 30f + safeRows.size() * rowHeight;
            ensureSpace(boxHeight + 8f);

            drawCard(MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight);
            writeTextAt("Etape", FONT_BOLD, 9.5f, MARGIN + 14f, y - 17f, TEXT_R, TEXT_G, TEXT_B);
            writeTextAt("Avancement", FONT_BOLD, 9.5f, PAGE_WIDTH - MARGIN - 132f, y - 17f, TEXT_R, TEXT_G, TEXT_B);

            float cursorY = y - 37f;
            for (ProgressRow row : safeRows) {
                int progress = Math.max(0, Math.min(100, row.progress()));
                writeTextAt(row.label(), FONT_BOLD, 9.5f, MARGIN + 14f, cursorY, TEXT_R, TEXT_G, TEXT_B);
                float barX = PAGE_WIDTH - MARGIN - 132f;
                float barY = cursorY - 5f;
                drawFilledRect(barX, barY, 92f, 7f, 0.88f, 0.93f, 0.96f);
                drawFilledRect(barX, barY, 92f * progress / 100f, 7f, ACCENT_R, ACCENT_G, ACCENT_B);
                writeTextAt(progress + "%", FONT_BOLD, 9f, barX + 100f, cursorY, ACCENT_R, ACCENT_G, ACCENT_B);
                cursorY -= rowHeight;
            }
            y -= boxHeight + 8f;
        }

        void addSignatureBlock(
                String leftTitle,
                String leftStatus,
                String rightTitle,
                String rightStatus,
                String closingDate
        ) throws IOException {
            float gap = 10f;
            float cardWidth = (CONTENT_WIDTH - gap) / 2f;
            float cardHeight = 56f;
            float blockHeight = 82f;
            ensureSpace(blockHeight + 8f);

            drawCard(MARGIN, y - cardHeight, cardWidth, cardHeight);
            drawCard(MARGIN + cardWidth + gap, y - cardHeight, cardWidth, cardHeight);

            writeTextAt(leftTitle, FONT_BOLD, 10.5f, MARGIN + 14f, y - 17f, TEXT_R, TEXT_G, TEXT_B);
            drawPill(leftStatus, MARGIN + 14f, y - 38f, 0.90f, 0.98f, 0.94f, 0.03f, 0.50f, 0.36f, cardWidth - 28f);

            float rightX = MARGIN + cardWidth + gap;
            writeTextAt(rightTitle, FONT_BOLD, 10.5f, rightX + 14f, y - 17f, TEXT_R, TEXT_G, TEXT_B);
            drawPill(rightStatus, rightX + 14f, y - 38f, 0.94f, 0.97f, 1.00f, ACCENT_R, ACCENT_G, ACCENT_B, cardWidth - 28f);

            y -= cardHeight + 8f;
            addKeyValue("Date de cloture", closingDate);
        }

        void addGraphicTimeline(List<TimelineStep> steps) throws IOException {
            List<TimelineStep> safeSteps = steps == null || steps.isEmpty()
                    ? List.of(new TimelineStep("Mission creee", "A confirmer", "Evenement initial", true))
                    : steps;

            for (int index = 0; index < safeSteps.size(); index += 1) {
                TimelineStep step = safeSteps.get(index);
                List<String> detailLines = hasText(step.details())
                        ? wrap(step.details(), FONT_REGULAR, 9.3f, CONTENT_WIDTH - 58f)
                        : List.of();
                float itemHeight = Math.max(48f, 35f + detailLines.size() * 11.5f);
                ensureSpace(itemHeight + 6f);

                float lineX = MARGIN + 17f;
                if (index < safeSteps.size() - 1) {
                    content.setStrokingColor(BORDER_R, BORDER_G, BORDER_B);
                    content.setLineWidth(1.2f);
                    content.moveTo(lineX, y - 13f);
                    content.lineTo(lineX, y - itemHeight + 2f);
                    content.stroke();
                }

                if (step.done()) {
                    drawFilledRect(lineX - 4f, y - 18f, 8f, 8f, ACCENT_R, ACCENT_G, ACCENT_B);
                } else {
                    drawStrokeRect(lineX - 4f, y - 18f, 8f, 8f, BORDER_R, BORDER_G, BORDER_B);
                }

                writeTextAt(step.title(), FONT_BOLD, 10.4f, MARGIN + 36f, y - 11f, TEXT_R, TEXT_G, TEXT_B);
                writeTextAt(step.date(), FONT_BOLD, 8.4f, PAGE_WIDTH - MARGIN - 104f, y - 11f, ACCENT_R, ACCENT_G, ACCENT_B);
                float textY = y - 28f;
                for (String line : detailLines) {
                    writeTextAt(line, FONT_REGULAR, 9.3f, MARGIN + 36f, textY, MUTED_R, MUTED_G, MUTED_B);
                    textY -= 11.5f;
                }
                y -= itemHeight;
            }
            y -= 6f;
        }

        void addKeyValue(String key, String value) throws IOException {
            String safeKey = sanitizeText(emptyFallback(key));
            String safeValue = sanitizeText(emptyFallback(value));
            float keyWidth = 132f;
            float valueWidth = CONTENT_WIDTH - keyWidth - 16f;
            List<String> lines = wrap(safeValue, FONT_REGULAR, 10.2f, valueWidth);
            float rowHeight = Math.max(19f, lines.size() * 13f + 5f);
            ensureSpace(rowHeight + 2f);

            drawFilledRect(MARGIN, y - rowHeight + 3f, CONTENT_WIDTH, rowHeight, 1f, 1f, 1f);
            drawStrokeRect(MARGIN, y - rowHeight + 3f, CONTENT_WIDTH, rowHeight, BORDER_R, BORDER_G, BORDER_B);
            writeTextAt(safeKey, FONT_BOLD, 8.8f, MARGIN + 10f, y - 11f, MUTED_R, MUTED_G, MUTED_B);

            float valueY = y - 11f;
            for (String line : lines) {
                writeTextAt(line, FONT_REGULAR, 10.2f, MARGIN + keyWidth + 10f, valueY, TEXT_R, TEXT_G, TEXT_B);
                valueY -= 13f;
            }
            y -= rowHeight + 3f;
        }

        void addParagraph(String value) throws IOException {
            List<String> lines = wrap(value, FONT_REGULAR, 10.4f, CONTENT_WIDTH - 24f);
            float boxHeight = lines.size() * 14f + 18f;
            ensureSpace(boxHeight + 6f);
            drawFilledRect(MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight, 1f, 1f, 1f);
            drawStrokeRect(MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight, BORDER_R, BORDER_G, BORDER_B);
            float textY = y - 14f;
            for (String line : lines) {
                writeTextAt(line, FONT_REGULAR, 10.4f, MARGIN + 12f, textY, TEXT_R, TEXT_G, TEXT_B);
                textY -= 14f;
            }
            y -= boxHeight + 7f;
        }

        void addIndentedParagraph(String value) throws IOException {
            writeWrapped(emptyFallback(value), FONT_REGULAR, 9.5f, 13f, 18f);
        }

        void addBullet(String value) throws IOException {
            List<String> lines = wrap(value, FONT_REGULAR, 10f, CONTENT_WIDTH - 26f);
            float blockHeight = Math.max(18f, lines.size() * 13f + 4f);
            ensureSpace(blockHeight + 4f);
            drawFilledRect(MARGIN + 2f, y - 10f, 5f, 5f, ACCENT_R, ACCENT_G, ACCENT_B);
            float textY = y - 10f;
            for (String line : lines) {
                writeTextAt(line, FONT_REGULAR, 10f, MARGIN + 18f, textY, TEXT_R, TEXT_G, TEXT_B);
                textY -= 13f;
            }
            y -= blockHeight;
        }

        void addMilestone(String title, String status, String deadline, String amount, String description) throws IOException {
            List<String> descriptionLines = hasText(description) ? wrap(description, FONT_REGULAR, 9.7f, CONTENT_WIDTH - 28f) : List.of();
            float boxHeight = 69f + descriptionLines.size() * 12.5f;
            ensureSpace(boxHeight + 8f);

            drawCard(MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight);
            drawFilledRect(MARGIN, y - boxHeight, 5f, boxHeight, ACCENT_R, ACCENT_G, ACCENT_B);
            writeTextAt(title, FONT_BOLD, 11.5f, MARGIN + 16f, y - 17f, TEXT_R, TEXT_G, TEXT_B);

            float statusWidth = drawPill(status, MARGIN + 16f, y - 38f, 0.90f, 0.98f, 0.94f, 0.03f, 0.50f, 0.36f);
            float deadlineX = MARGIN + 16f + statusWidth + 8f;
            float amountX = PAGE_WIDTH - MARGIN - 92f;
            float maxDeadlineWidth = Math.max(40f, amountX - deadlineX - 10f);

            if (maxDeadlineWidth >= 36f) {
                drawPill(deadline, deadlineX, y - 38f, 0.94f, 0.97f, 1.00f, ACCENT_R, ACCENT_G, ACCENT_B, maxDeadlineWidth);
            } else {
                // Not enough horizontal room: drop the deadline pill to its own line.
                drawPill(deadline, MARGIN + 16f, y - 38f - 18f, 0.94f, 0.97f, 1.00f, ACCENT_R, ACCENT_G, ACCENT_B);
            }

            writeTextAt(amount, FONT_BOLD, 10f, amountX, y - 17f, ACCENT_R, ACCENT_G, ACCENT_B);

            float textY = y - 62f;
            for (String line : descriptionLines) {
                writeTextAt(line, FONT_REGULAR, 9.7f, MARGIN + 16f, textY, MUTED_R, MUTED_G, MUTED_B);
                textY -= 12.5f;
            }
            y -= boxHeight + 8f;
        }

        void addTimelineItem(String dateOrActor, String title, String details) throws IOException {
            List<String> detailLines = hasText(details) ? wrap(details, FONT_REGULAR, 9.5f, CONTENT_WIDTH - 38f) : List.of();
            float itemHeight = Math.max(42f, 34f + detailLines.size() * 12f);
            ensureSpace(itemHeight + 4f);

            float dotX = MARGIN + 8f;
            content.setLineWidth(1f);
            content.setStrokingColor(BORDER_R, BORDER_G, BORDER_B);
            content.moveTo(dotX + 3f, y - 6f);
            content.lineTo(dotX + 3f, y - itemHeight + 4f);
            content.stroke();
            drawFilledRect(dotX, y - 14f, 7f, 7f, ACCENT_R, ACCENT_G, ACCENT_B);

            writeTextAt(dateOrActor, FONT_BOLD, 8.5f, MARGIN + 24f, y - 8f, MUTED_R, MUTED_G, MUTED_B);
            writeTextAt(title, FONT_BOLD, 10.4f, MARGIN + 24f, y - 24f, TEXT_R, TEXT_G, TEXT_B);
            float textY = y - 38f;
            for (String line : detailLines) {
                writeTextAt(line, FONT_REGULAR, 9.5f, MARGIN + 24f, textY, MUTED_R, MUTED_G, MUTED_B);
                textY -= 12f;
            }
            y -= itemHeight;
        }

        void addStatusPill(String label, float fillR, float fillG, float fillB, float textR, float textG, float textB)
                throws IOException {
            ensureSpace(26f);
            drawPill(label, MARGIN, y - 16f, fillR, fillG, fillB, textR, textG, textB);
            y -= 26f;
        }

        void addDivider() throws IOException {
            ensureSpace(18f);
            y -= 8f;
            content.setStrokingColor(210 / 255f, 214 / 255f, 220 / 255f);
            content.moveTo(MARGIN, y);
            content.lineTo(PAGE_WIDTH - MARGIN, y);
            content.stroke();
            y -= 8f;
        }

        byte[] save() throws IOException {
            closeContent();
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        }

        private float[] columnWidths(int columns) {
            float[] widths = new float[columns];
            if (columns == 1) {
                widths[0] = CONTENT_WIDTH;
                return widths;
            }
            if (columns == 2) {
                widths[0] = CONTENT_WIDTH * 0.38f;
                widths[1] = CONTENT_WIDTH - widths[0];
                return widths;
            }
            float equalWidth = CONTENT_WIDTH / columns;
            for (int index = 0; index < columns; index += 1) {
                widths[index] = equalWidth;
            }
            return widths;
        }

        private void writeWrapped(String value, PDFont font, float fontSize, float leading, float indent) throws IOException {
            for (String line : wrap(value, font, fontSize, CONTENT_WIDTH - indent)) {
                ensureSpace(leading);
                writeTextAt(line, font, fontSize, MARGIN + indent, y, TEXT_R, TEXT_G, TEXT_B);
                y -= leading;
            }
        }

        private List<String> wrap(String value, PDFont font, float fontSize, float maxWidth) throws IOException {
            String normalizedValue = sanitizeText(emptyFallback(value));
            if (normalizedValue.isBlank()) {
                return List.of("");
            }

            java.util.ArrayList<String> lines = new java.util.ArrayList<>();
            StringBuilder current = new StringBuilder();
            for (String word : normalizedValue.split("\\s+")) {
                String candidate = current.isEmpty() ? word : current + " " + word;
                if (stringWidth(candidate, font, fontSize) <= maxWidth) {
                    current.setLength(0);
                    current.append(candidate);
                } else {
                    if (!current.isEmpty()) {
                        lines.add(current.toString());
                    }
                    current.setLength(0);
                    current.append(word);
                }
            }
            if (!current.isEmpty()) {
                lines.add(current.toString());
            }
            return lines.isEmpty() ? List.of("") : lines;
        }

        private float stringWidth(String value, PDFont font, float fontSize) throws IOException {
            return font.getStringWidth(value) / 1000f * fontSize;
        }

        private void ensureSpace(float needed) throws IOException {
            if (y - needed < FOOTER_HEIGHT) {
                addPage();
            }
        }

        private void addPage() throws IOException {
            closeContent();
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            content = new PDPageContentStream(document, page);
            pageNumber += 1;
            drawFilledRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 1f, 1f, 1f);
            content.setStrokingColor(BORDER_R, BORDER_G, BORDER_B);
            content.setLineWidth(0.6f);
            content.moveTo(MARGIN, 28f);
            content.lineTo(PAGE_WIDTH - MARGIN, 28f);
            content.stroke();
            writeTextAt("Marketplace Freelance", FONT_BOLD, 8f, MARGIN, 14f, MUTED_R, MUTED_G, MUTED_B);
            String pageLabel = "Page " + pageNumber;
            float pageLabelWidth = stringWidth(pageLabel, FONT_BOLD, 8f);
            writeTextAt(pageLabel, FONT_BOLD, 8f, PAGE_WIDTH - MARGIN - pageLabelWidth, 14f, ACCENT_R, ACCENT_G, ACCENT_B);
            y = PAGE_HEIGHT - MARGIN - TOP_PADDING;
        }

        private void closeContent() throws IOException {
            if (content != null) {
                content.close();
                content = null;
            }
        }

        private String emptyFallback(String value) {
            return value == null || value.isBlank() ? "Non renseigne" : value.trim();
        }

        private String sanitizeText(String value) {
            String normalized = emptyFallback(value)
                    .replace('\r', ' ')
                    .replace('\n', ' ')
                    .replace('\u00a0', ' ')
                    .replace('’', '\'')
                    .replace('‘', '\'')
                    .replace('“', '"')
                    .replace('”', '"')
                    .replace('–', '-')
                    .replace('—', '-')
                    .replace("œ", "oe")
                    .replace("Œ", "OE");

            StringBuilder safeText = new StringBuilder(normalized.length());
            for (int index = 0; index < normalized.length(); index += 1) {
                char character = normalized.charAt(index);
                if ((character >= 32 && character <= 126) || (character >= 160 && character <= 255)) {
                    safeText.append(character);
                } else {
                    safeText.append('?');
                }
            }

            return safeText.toString();
        }

        private void writeTextAt(
                String value,
                PDFont font,
                float fontSize,
                float x,
                float baselineY,
                float r,
                float g,
                float b
        ) throws IOException {
            content.beginText();
            content.setNonStrokingColor(r, g, b);
            content.setFont(font, fontSize);
            content.newLineAtOffset(x, baselineY);
            content.showText(sanitizeText(emptyFallback(value)));
            content.endText();
        }

        private void drawFilledRect(float x, float bottomY, float width, float height, float r, float g, float b)
                throws IOException {
            content.setNonStrokingColor(r, g, b);
            content.addRect(x, bottomY, width, height);
            content.fill();
        }

        private void drawStrokeRect(float x, float bottomY, float width, float height, float r, float g, float b)
                throws IOException {
            content.setStrokingColor(r, g, b);
            content.setLineWidth(0.8f);
            content.addRect(x, bottomY, width, height);
            content.stroke();
        }

        private void drawCard(float x, float bottomY, float width, float height) throws IOException {
            drawFilledRect(x, bottomY, width, height, 1f, 1f, 1f);
            drawStrokeRect(x, bottomY, width, height, BORDER_R, BORDER_G, BORDER_B);
        }

        private float drawPill(
                String value,
                float x,
                float baselineY,
                float fillR,
                float fillG,
                float fillB,
                float textR,
                float textG,
                float textB
        ) throws IOException {
            return drawPill(value, x, baselineY, fillR, fillG, fillB, textR, textG, textB, 96f);
        }

        private float drawPill(
                String value,
                float x,
                float baselineY,
                float fillR,
                float fillG,
                float fillB,
                float textR,
                float textG,
                float textB,
                float maxWidth
        ) throws IOException {
            String safeValue = sanitizeText(emptyFallback(value));
            float width = Math.min(maxWidth, stringWidth(safeValue, FONT_BOLD, 8.2f) + 18f);
            if (width < 28f) {
                width = Math.min(maxWidth, 28f);
            }
            drawFilledRect(x, baselineY - 10f, width, 15f, fillR, fillG, fillB);
            writeTextAt(safeValue, FONT_BOLD, 8.2f, x + 8f, baselineY - 5f, textR, textG, textB);
            return width;
        }

        private boolean hasText(String value) {
            return value != null && !value.trim().isEmpty();
        }
    }
}
