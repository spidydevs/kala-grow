import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Settings, Trash2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  isVoice?: boolean;
  processing?: boolean;
  actions?: string[];
  metadata?: any;
}

interface ConversationalInterfaceProps {
  onActionRequested?: (action: string, data?: any) => void;
}

export function ConversationalInterface({ onActionRequested }: ConversationalInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize conversation
    setConversationId(crypto.randomUUID());
    
    // Check for speech recognition support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendMessage(transcript, true);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      setVoiceEnabled(true);
    }
    
    // Add welcome message
    setMessages([{
      id: crypto.randomUUID(),
      type: 'assistant',
      content: 'Hello! I\'m Kala, your AI productivity assistant. You can ask me about your tasks, clients, finances, or tell me what you\'d like to do. Try saying "Show me my tasks" or "Create a new task".',
      timestamp: new Date(),
      actions: ['View Tasks', 'View Clients', 'Time Tracking', 'Analytics']
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (text: string = inputText, isVoiceInput: boolean = false) => {
    if (!text.trim() || isProcessing) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: text,
      timestamp: new Date(),
      isVoice: isVoiceInput
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    // Add processing message
    const processingMessage: Message = {
      id: crypto.randomUUID(),
      type: 'assistant',
      content: 'Processing your request...',
      timestamp: new Date(),
      processing: true
    };
    setMessages(prev => [...prev, processingMessage]);

    try {
      // Process with NLP engine
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const nlpResponse = await supabase.functions.invoke('nlp-processor', {
        body: {
          message: text,
          conversationId,
          context: { voice_input: isVoiceInput }
        }
      });

      if (nlpResponse.error) {
        throw new Error(nlpResponse.error.message);
      }

      const nlpResult = nlpResponse.data;
      let responseContent = nlpResult.response_text;
      let actionResult = null;
      let queryResult = null;

      // Handle data queries
      if (nlpResult.intent === 'DATA_QUERY') {
        const dataResponse = await supabase.functions.invoke('conversational-data-fetcher', {
          body: {
            queryType: nlpResult.query_type,
            parameters: nlpResult.parameters,
            entities: nlpResult.entities,
            intent: nlpResult.intent
          }
        });

        if (dataResponse.data) {
          queryResult = dataResponse.data;
          responseContent = formatQueryResponse(queryResult);
        }
      }

      // Handle action execution
      if (nlpResult.intent === 'ACTION_EXECUTE') {
        const actionResponse = await supabase.functions.invoke('conversational-action-executor', {
          body: {
            actionType: nlpResult.action_type,
            parameters: nlpResult.parameters,
            entities: nlpResult.entities,
            originalMessage: text
          }
        });

        if (actionResponse.data) {
          actionResult = actionResponse.data;
          responseContent = actionResult.success_message;
        }
      }

      // Remove processing message and add actual response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.processing);
        return [...filtered, {
          id: crypto.randomUUID(),
          type: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          actions: actionResult?.follow_up_actions || nlpResult.suggested_actions,
          metadata: {
            nlpResult,
            queryResult,
            actionResult,
            confidence: nlpResult.confidence
          }
        }];
      });

      // Handle text-to-speech if enabled
      if (audioEnabled && !isVoiceInput) {
        speak(responseContent);
      }

    } catch (error) {
      console.error('Conversation error:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.processing);
        return [...filtered, {
          id: crypto.randomUUID(),
          type: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        }];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatQueryResponse = (queryResult: any): string => {
    if (!queryResult || !queryResult.result) return 'No data found.';

    const { result } = queryResult;
    let response = '';

    // Format based on query type
    if (result.tasks) {
      const tasks = result.tasks;
      response = `Found ${tasks.length} tasks. `;
      if (tasks.length > 0) {
        response += `Recent tasks: ${tasks.slice(0, 3).map((t: any) => t.title).join(', ')}`;
      }
    }

    if (result.clients) {
      const clients = result.clients;
      response += `You have ${clients.length} clients with total lifetime value of $${result.total_revenue?.toLocaleString() || 0}. `;
    }

    if (result.invoices) {
      const invoices = result.invoices;
      response += `Found ${invoices.length} invoices. Total revenue: $${result.total_revenue?.toLocaleString() || 0}, Pending: $${result.pending_revenue?.toLocaleString() || 0}. `;
    }

    if (result.time_entries) {
      response += `Total tracked time: ${result.total_hours} hours across ${result.total_entries} sessions. `;
    }

    return response || 'Data retrieved successfully.';
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window && audioEnabled) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      synthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!voiceEnabled) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const clearConversation = () => {
    setMessages([{
      id: crypto.randomUUID(),
      type: 'assistant',
      content: 'Conversation cleared. How can I help you today?',
      timestamp: new Date(),
      actions: ['View Tasks', 'View Clients', 'Time Tracking', 'Analytics']
    }]);
    setConversationId(crypto.randomUUID());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleActionClick = (action: string) => {
    if (onActionRequested) {
      onActionRequested(action);
    } else {
      // Send as message
      handleSendMessage(action);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Kala AI Assistant</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              audioEnabled 
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title={audioEnabled ? 'Disable audio responses' : 'Enable audio responses'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={clearConversation}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.processing
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-2">
                <div className="flex-1">
                  <p className="text-sm">{message.content}</p>
                  
                  {/* Action buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleActionClick(action)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {message.isVoice && (
                  <Mic className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                )}
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {message.metadata?.confidence && (
                  <span className="text-xs opacity-70">
                    {Math.round(message.metadata.confidence * 100)}% confident
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isListening ? 'Listening...' : 'Type your message or use voice...'}
              disabled={isProcessing || isListening}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          
          {voiceEnabled && (
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`p-3 rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
          
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isProcessing}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {isListening && (
          <div className="mt-2 text-center">
            <span className="text-sm text-blue-600">🎤 Listening... Speak now</span>
          </div>
        )}
      </div>
    </div>
  );
}