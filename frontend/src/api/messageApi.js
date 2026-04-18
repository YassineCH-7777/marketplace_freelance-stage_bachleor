import API from './axiosConfig';

export const getConversations = () => API.get('/messages/conversations');
export const createConversation = (targetUserId, targetRole) => 
  API.post(`/messages/conversations?targetUserId=${targetUserId}&targetRole=${targetRole}`);
export const getMessages = (conversationId) => API.get(`/messages/conversations/${conversationId}`);
export const sendMessage = (conversationId, content) => 
  API.post(`/messages/conversations/${conversationId}`, { content });
