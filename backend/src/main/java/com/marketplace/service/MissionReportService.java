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
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

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
                .sorted(Comparator.comparing(MissionActivity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<Attachment> attachments = safeList(attachmentRepository.findByOrder_IdOrderByCreatedAtAsc(orderId));
        List<Message> importantMessages = getImportantMessages(orderId);
        Review review = reviewRepository.findByOrder_Id(orderId).orElse(null);

        try (PDDocument document = new PDDocument()) {
            PDDocumentInformation information = document.getDocumentInformation();
            information.setTitle("Rapport de mission #" + order.getId());
            information.setSubject(resolveMissionTitle(order));
            information.setAuthor("Marketplace Freelance");

            PdfReportWriter writer = new PdfReportWriter(document);
            writeReport(writer, order, milestones, activities, attachments, importantMessages, review);
            return writer.save();
        } catch (IOException ex) {
            throw new BusinessException("Impossible de generer le rapport PDF.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private void writeReport(
            PdfReportWriter writer,
            Order order,
            List<MissionMilestone> milestones,
            List<MissionActivity> activities,
            List<Attachment> attachments,
            List<Message> importantMessages,
            Review review
    ) throws IOException {
        writer.addTitle("Rapport de mission");
        writer.addSubtitle(resolveMissionTitle(order));
        writer.addKeyValue("Mission", "#" + order.getId());
        writer.addKeyValue("Client", order.getClient().getEmail());
        writer.addKeyValue("Freelance", order.getFreelancer().getUser().getEmail());
        writer.addKeyValue("Genere le", formatDateTime(LocalDateTime.now()));
        writer.addDivider();

        writer.addSection("Resume");
        writer.addKeyValue("Statut", formatOrderStatus(order.getStatus()));
        writer.addKeyValue("Progression", safeProgress(order.getProgressPercentage()) + "%");
        writer.addParagraph(resolveInitialBrief(order));
        if (hasText(order.getNotes())) {
            writer.addParagraph("Suivi partage: " + order.getNotes());
        }

        writer.addSection("Etapes");
        if (milestones.isEmpty()) {
            writer.addParagraph("Aucun jalon renseigne pour cette mission.");
        } else {
            for (MissionMilestone milestone : milestones) {
                writer.addBullet(
                        milestone.getTitle()
                                + " | " + formatMilestoneStatus(milestone.getStatus())
                                + " | " + formatDate(milestone.getDeadline())
                                + " | " + formatAmount(milestone.getAmount()));
                if (hasText(milestone.getDescription())) {
                    writer.addIndentedParagraph(milestone.getDescription());
                }
            }
        }

        writer.addSection("Dates");
        writer.addKeyValue("Creation", formatDateTime(order.getCreatedAt()));
        writer.addKeyValue("Debut", formatDate(order.getStartDate()));
        writer.addKeyValue("Echeance", formatDate(order.getDueDate()));
        writer.addKeyValue("Livraison", formatDateTime(order.getDeliveredAt()));
        writer.addKeyValue("Fin", formatDate(order.getEndDate()));
        writer.addKeyValue("Derniere mise a jour", formatDateTime(order.getUpdatedAt()));

        writer.addSection("Prix");
        writer.addKeyValue("Montant convenu", formatAmount(order.getAgreedPrice()));
        writer.addKeyValue("Paiement", formatPaymentStatus(order.getPaymentStatus()));
        Proposal proposal = order.getProposal();
        if (proposal != null) {
            writer.addKeyValue("Delai estime", proposal.getEstimatedDays() + " jour(s)");
            if (hasText(proposal.getMessage())) {
                writer.addParagraph("Message de candidature: " + proposal.getMessage());
            }
        }

        writer.addSection("Messages importants");
        if (importantMessages.isEmpty()) {
            writer.addParagraph("Aucun message n'a ete marque comme important.");
        } else {
            for (Message message : importantMessages) {
                writer.addBullet(formatDateTime(message.getCreatedAt()) + " - "
                        + message.getSender().getEmail() + ": " + message.getContent());
            }
        }

        writer.addSection("Livraison finale");
        writer.addKeyValue("Statut de livraison", formatOrderStatus(order.getStatus()));
        writer.addKeyValue("Livree le", formatDateTime(order.getDeliveredAt()));
        writer.addParagraph(hasText(order.getDeliveryNote())
                ? order.getDeliveryNote()
                : "Aucune note de livraison finale n'a encore ete partagee.");
        if (hasText(order.getRevisionRequest())) {
            writer.addParagraph("Revision demandee: " + order.getRevisionRequest());
        }
        if (attachments.isEmpty()) {
            writer.addParagraph("Aucun fichier de livraison rattache a cette mission.");
        } else {
            writer.addParagraph("Fichiers livres:");
            for (Attachment attachment : attachments) {
                writer.addBullet(attachment.getOriginalFileName() + " - " + attachment.getAttachmentType()
                        + " - " + formatDateTime(attachment.getCreatedAt()));
            }
        }

        if (hasText(order.getDisputeReason())) {
            writer.addSection("Litige");
            writer.addKeyValue("Ouvert le", formatDateTime(order.getDisputeOpenedAt()));
            writer.addKeyValue("Ouvert par", order.getDisputeOpenedBy() != null ? order.getDisputeOpenedBy().getEmail() : "-");
            writer.addParagraph("Motif: " + order.getDisputeReason());
            if (hasText(order.getDisputeAdminNotes())) {
                writer.addParagraph("Arbitrage admin: " + order.getDisputeAdminNotes());
            }
            if (hasText(order.getDisputeResolution())) {
                writer.addKeyValue("Decision", order.getDisputeResolution());
                writer.addKeyValue("Resolution", formatDateTime(order.getDisputeResolvedAt()));
            }
        }

        writer.addSection("Timeline");
        if (activities.isEmpty()) {
            writer.addParagraph("Aucune activite enregistree.");
        } else {
            for (MissionActivity activity : activities) {
                writer.addBullet(formatDateTime(activity.getCreatedAt()) + " - " + activity.getTitle());
                if (hasText(activity.getDetails())) {
                    writer.addIndentedParagraph(activity.getDetails());
                }
            }
        }

        if (review != null) {
            writer.addSection("Avis client");
            writer.addKeyValue("Note globale", review.getRating() + "/5");
            writer.addKeyValue("Qualite", review.getQualityRating() + "/5");
            writer.addKeyValue("Ponctualite", review.getPunctualityRating() + "/5");
            writer.addKeyValue("Communication", review.getCommunicationRating() + "/5");
            if (hasText(review.getComment())) {
                writer.addParagraph(review.getComment());
            }
        }
    }

    private List<Message> getImportantMessages(Long orderId) {
        Optional<Conversation> conversation = conversationRepository.findByOrder_Id(orderId);
        return conversation
                .map(value -> safeList(messageRepository.findByConversation_IdAndImportantTrueOrderByCreatedAtAsc(value.getId())))
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

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private <T> List<T> safeList(List<T> values) {
        return values != null ? values : List.of();
    }

    private static class PdfReportWriter {
        private static final PDFont FONT_REGULAR = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        private static final PDFont FONT_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        private static final float MARGIN = 48f;
        private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
        private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
        private static final float CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

        private final PDDocument document;
        private PDPageContentStream content;
        private float y;

        PdfReportWriter(PDDocument document) throws IOException {
            this.document = document;
            addPage();
        }

        void addTitle(String value) throws IOException {
            writeWrapped(value, FONT_BOLD, 22f, 27f, 0f);
            y -= 4f;
        }

        void addSubtitle(String value) throws IOException {
            writeWrapped(value, FONT_BOLD, 14f, 18f, 0f);
            y -= 8f;
        }

        void addSection(String value) throws IOException {
            ensureSpace(38f);
            y -= 10f;
            writeWrapped(value, FONT_BOLD, 14f, 18f, 0f);
            y -= 2f;
        }

        void addKeyValue(String key, String value) throws IOException {
            writeWrapped(key + ": " + emptyFallback(value), FONT_REGULAR, 10.5f, 14.5f, 0f);
        }

        void addParagraph(String value) throws IOException {
            writeWrapped(emptyFallback(value), FONT_REGULAR, 10.5f, 14.5f, 0f);
            y -= 2f;
        }

        void addIndentedParagraph(String value) throws IOException {
            writeWrapped(emptyFallback(value), FONT_REGULAR, 9.5f, 13f, 14f);
        }

        void addBullet(String value) throws IOException {
            writeWrapped("- " + emptyFallback(value), FONT_REGULAR, 10f, 14f, 0f);
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

        private void writeWrapped(String value, PDFont font, float fontSize, float leading, float indent) throws IOException {
            for (String line : wrap(value, font, fontSize, CONTENT_WIDTH - indent)) {
                ensureSpace(leading);
                content.beginText();
                content.setFont(font, fontSize);
                content.newLineAtOffset(MARGIN + indent, y);
                content.showText(line);
                content.endText();
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
            if (y - needed < MARGIN) {
                addPage();
            }
        }

        private void addPage() throws IOException {
            closeContent();
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            content = new PDPageContentStream(document, page);
            y = PAGE_HEIGHT - MARGIN;
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
            String withoutMarks = Normalizer.normalize(value, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "");
            return withoutMarks
                    .replace('\r', ' ')
                    .replace('\n', ' ')
                    .replaceAll("[^\\x20-\\x7E]", "?");
        }
    }
}
