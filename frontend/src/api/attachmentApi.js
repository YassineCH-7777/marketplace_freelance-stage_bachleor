import API from './axiosConfig';

const buildAttachmentFormData = (files, type) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  if (type) {
    formData.append('type', type);
  }
  return formData;
};

export const uploadMessageAttachments = (messageId, files, type) =>
  API.post(`/attachments/messages/${messageId}`, buildAttachmentFormData(files, type));

export const uploadServiceRequestAttachments = (requestId, files, type = 'BRIEF') =>
  API.post(`/attachments/service-requests/${requestId}`, buildAttachmentFormData(files, type));

export const uploadOrderAttachments = (orderId, files, type = 'DELIVERY_PROOF') =>
  API.post(`/attachments/orders/${orderId}`, buildAttachmentFormData(files, type));
