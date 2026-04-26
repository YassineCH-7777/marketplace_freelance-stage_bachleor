import API from './axiosConfig';

export const getConversations = () => API.get('/messages/conversations');
export const createConversation = (targetUserId, targetRole) => 
  API.post('/messages/conversations', null, { params: { targetUserId, targetRole } });
export const createOrderConversation = (orderId) =>
  API.post(`/messages/conversations/orders/${orderId}`);
export const getMessages = (conversationId) => API.get(`/messages/conversations/${conversationId}`);
export const sendMessage = (conversationId, content) => 
  API.post(`/messages/conversations/${conversationId}`, { content });
