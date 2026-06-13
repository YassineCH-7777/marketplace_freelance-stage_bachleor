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
        writer.addHeader(
                "Rapport de mission",
                resolveMissionTitle(order),
                List.of(
                        "Mission #" + order.getId(),
                        "Genere le " + formatDateTime(LocalDateTime.now()),
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

        writer.addSection("Resume");
        writer.addParagraph(resolveInitialBrief(order));
        if (hasText(order.getNotes())) {
            writer.addParagraph("Suivi partage: " + order.getNotes());
        }

        writer.addSection("Etapes");
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

        writer.addSection("Dates cles");
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
                writer.addTimelineItem(
                        formatDateTime(message.getCreatedAt()),
                        message.getSender().getEmail(),
                        message.getContent());
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
                writer.addTimelineItem(
                        formatDateTime(activity.getCreatedAt()),
                        activity.getTitle(),
                        activity.getDetails());
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

    private record ReportMetric(String label, String value) {
    }

    private static class PdfReportWriter {
        private static final PDFont FONT_REGULAR = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        private static final PDFont FONT_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
        private static final float MARGIN = 42f;
        private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
        private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
        private static final float CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
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
            float headerHeight = 122f;
            ensureSpace(headerHeight + 18f);
            drawFilledRect(MARGIN, y - headerHeight, CONTENT_WIDTH, headerHeight, PRIMARY_R, PRIMARY_G, PRIMARY_B);
            drawFilledRect(MARGIN, y - headerHeight, 6f, headerHeight, ACCENT_R, ACCENT_G, ACCENT_B);

            float textX = MARGIN + 24f;
            float textY = y - 28f;
            writeTextAt("Marketplace Freelance", FONT_BOLD, 8.5f, textX, textY, 0.70f, 0.86f, 0.95f);
            textY -= 24f;
            writeTextAt(title, FONT_BOLD, 25f, textX, textY, 1f, 1f, 1f);
            textY -= 20f;

            List<String> subtitleLines = wrap(subtitle, FONT_REGULAR, 11.5f, CONTENT_WIDTH - 48f);
            for (String line : subtitleLines.stream().limit(2).toList()) {
                writeTextAt(line, FONT_REGULAR, 11.5f, textX, textY, 0.86f, 0.93f, 0.98f);
                textY -= 14f;
            }

            float chipX = textX;
            float chipY = y - headerHeight + 18f;
            for (String item : metaItems) {
                String chipText = sanitizeText(emptyFallback(item));
                float chipWidth = Math.min(180f, stringWidth(chipText, FONT_BOLD, 8.5f) + 18f);
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
            float boxHeight = 62f + descriptionLines.size() * 12.5f;
            ensureSpace(boxHeight + 8f);

            drawCard(MARGIN, y - boxHeight, CONTENT_WIDTH, boxHeight);
            drawFilledRect(MARGIN, y - boxHeight, 5f, boxHeight, ACCENT_R, ACCENT_G, ACCENT_B);
            writeTextAt(title, FONT_BOLD, 11.5f, MARGIN + 16f, y - 17f, TEXT_R, TEXT_G, TEXT_B);
            drawPill(status, MARGIN + 16f, y - 38f, 0.90f, 0.98f, 0.94f, 0.03f, 0.50f, 0.36f);
            drawPill(deadline, MARGIN + 96f, y - 38f, 0.94f, 0.97f, 1.00f, ACCENT_R, ACCENT_G, ACCENT_B);
            writeTextAt(amount, FONT_BOLD, 10f, PAGE_WIDTH - MARGIN - 92f, y - 17f, ACCENT_R, ACCENT_G, ACCENT_B);

            float textY = y - 55f;
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
            if (y - needed < MARGIN) {
                addPage();
            }
        }

        private void addPage() throws IOException {
            closeContent();
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            content = new PDPageContentStream(document, page);
            pageNumber += 1;
            drawFilledRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 0.96f, 0.98f, 0.99f);
            writeTextAt("Marketplace Freelance", FONT_BOLD, 8f, MARGIN, 24f, MUTED_R, MUTED_G, MUTED_B);
            writeTextAt("Page " + pageNumber, FONT_REGULAR, 8f, PAGE_WIDTH - MARGIN - 32f, 24f, MUTED_R, MUTED_G, MUTED_B);
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

        private void drawPill(
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
            String safeValue = sanitizeText(emptyFallback(value));
            float width = Math.min(96f, stringWidth(safeValue, FONT_BOLD, 8.2f) + 18f);
            drawFilledRect(x, baselineY - 10f, width, 15f, fillR, fillG, fillB);
            writeTextAt(safeValue, FONT_BOLD, 8.2f, x + 8f, baselineY - 5f, textR, textG, textB);
        }

        private boolean hasText(String value) {
            return value != null && !value.trim().isEmpty();
        }
    }
}
