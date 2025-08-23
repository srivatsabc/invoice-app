import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { API_ENDPOINTS } from '../constants/api';
import { INCIDENT_API_ENDPOINTS } from '../constants/incidentApi';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Simple markdown renderer for basic formatting
  const renderMarkdown = (text: string) => {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert `code` to <code>
    text = text.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Convert ### headers to <h3>
    text = text.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>');
    
    // Convert ## headers to <h2>
    text = text.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h2>');
    
    // Convert # headers to <h1>
    text = text.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>');
    
    // Convert line breaks to <br>
    text = text.replace(/\n/g, '<br>');
    
    // Convert bullet points (- item) to <ul><li>
    text = text.replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>');
    text = text.replace(/(<li.*<\/li>)/g, '<ul class="space-y-1 my-2">$1</ul>');
    
    // Convert numbered lists (1. item) to <ol><li>
    text = text.replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>');
    
    return text;
  };

  return (
    <div 
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MessageAvatarProps {
  isAssistant: boolean;
}

const MessageAvatar: React.FC<MessageAvatarProps> = ({ isAssistant }) => (
  <div className="flex-shrink-0">
    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
      <img
        src={isAssistant ? "/assistant-icon.png" : "/user-icon.png"}
        alt={isAssistant ? "Assistant" : "User"}
        className="w-full h-full object-cover"
        loading="eager"
      />
    </div>
  </div>
);

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! How can I help you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const sessionId = localStorage.getItem('sessionId');
      const userRole = localStorage.getItem('userRole');
      if (!sessionId) {
        throw new Error('No session ID found');
      }

      // Use different endpoints based on user role
      const endpoint = userRole === 'itsm_admin' 
        ? INCIDENT_API_ENDPOINTS.INCIDENT_ANALYTICS_AGENT 
        : API_ENDPOINTS.SQL_AGENT;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          question: inputValue,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chat agent');
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || data.response || 'I apologize, but I could not process your request at this time.',
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I encountered an error while processing your request.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50">
      <div className="bg-[#1e88e5] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageAvatar isAssistant={true} />
          <h3 className="font-semibold">Invoice Assistant</h3>
        </div>
        <button 
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-end space-x-2 ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
          >
            <MessageAvatar isAssistant={message.sender === 'bot'} />
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-[#1e88e5] text-white rounded-br-none'
                  : 'bg-white text-gray-800 rounded-bl-none'
              }`}
            >
              <div className="text-sm">
                {message.sender === 'bot' ? (
                  <MarkdownRenderer content={message.text} />
                ) : (
                  <p>{message.text}</p>
                )}
              </div>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="bg-[#1e88e5] text-white p-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;