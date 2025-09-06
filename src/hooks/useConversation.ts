import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ConversationManager, NLPResult, QueryResult, ActionResult } from '@/utils/conversationHelpers';

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  isVoice?: boolean;
  processing?: boolean;
  actions?: string[];
  metadata?: {
    nlpResult?: NLPResult;
    queryResult?: QueryResult;
    actionResult?: ActionResult;
    confidence?: number;
  };
}

export interface ConversationState {
  messages: Message[];
  isProcessing: boolean;
  conversationId: string;
  context: Record<string, any>;
}

export function useConversation() {
  const [state, setState] = useState<ConversationState>({
    messages: [],
    isProcessing: false,
    conversationId: crypto.randomUUID(),
    context: {}
  });
  
  const conversationManager = useRef(new ConversationManager());

  // Initialize conversation with welcome message
  const initializeConversation = useCallback(() => {
    const welcomeMessage: Message = {
      id: crypto.randomUUID(),
      type: 'assistant',
      content: 'Hello! I\'m Kala, your AI productivity assistant. I can help you manage tasks, track time, analyze data, and much more. What would you like to do today?',
      timestamp: new Date(),
      actions: ['View Tasks', 'View Clients', 'Time Tracking', 'Analytics']
    };
    
    setState(prev => ({
      ...prev,
      messages: [welcomeMessage]
    }));
  }, []);

  // Send a message and process the response
  const sendMessage = useCallback(async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim() || state.isProcessing) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: text,
      timestamp: new Date(),
      isVoice: isVoiceInput
    };

    // Add user message
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isProcessing: true
    }));

    // Add processing indicator
    const processingMessage: Message = {
      id: crypto.randomUUID(),
      type: 'assistant',
      content: 'Processing your request...',
      timestamp: new Date(),
      processing: true
    };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, processingMessage]
    }));

    try {
      // Update conversation manager
      conversationManager.current.addToHistory('user', text);

      // Get user for authentication
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Process with AI assistant
      const nlpResponse = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: text,
          conversationId: state.conversationId,
          context: { 
            voice_input: isVoiceInput,
            ...conversationManager.current.getContext()
          }
        }
      });

      if (nlpResponse.error) {
        throw new Error(nlpResponse.error.message);
      }

      const nlpResult: NLPResult = nlpResponse.data;
      let responseContent = nlpResult.response_text;
      let actionResult: ActionResult | null = null;
      let queryResult: QueryResult | null = null;

      // Handle data queries
      if (nlpResult.intent === 'DATA_QUERY' && nlpResult.query_type) {
        const dataResponse = await supabase.functions.invoke('comprehensive-analytics', {
          body: {
            queryType: nlpResult.query_type,
            parameters: nlpResult.parameters,
            entities: nlpResult.entities,
            intent: nlpResult.intent
          }
        });

        if (dataResponse.data && !dataResponse.error) {
          queryResult = dataResponse.data;
          responseContent = formatQueryResponse(queryResult);
        }
      }

      // Handle action execution
      if (nlpResult.intent === 'ACTION_EXECUTE' && nlpResult.action_type) {
        const actionResponse = await supabase.functions.invoke('ai-task-creator', {
          body: {
            actionType: nlpResult.action_type,
            parameters: nlpResult.parameters,
            entities: nlpResult.entities,
            originalMessage: text
          }
        });

        if (actionResponse.data && !actionResponse.error) {
          actionResult = actionResponse.data;
          responseContent = actionResult.success_message || responseContent;
        }
      }

      // Update conversation context
      if (nlpResult.context_update) {
        conversationManager.current.updateContext(nlpResult.context_update);
        setState(prev => ({
          ...prev,
          context: { ...prev.context, ...nlpResult.context_update }
        }));
      }

      // Add to conversation history
      conversationManager.current.addToHistory('assistant', responseContent);

      // Remove processing message and add actual response
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages.filter(m => !m.processing),
          {
            id: crypto.randomUUID(),
            type: 'assistant',
            content: responseContent,
            timestamp: new Date(),
            actions: actionResult?.follow_up_actions || nlpResult.suggested_actions,
            metadata: {
              nlpResult,
              queryResult: queryResult || undefined,
              actionResult: actionResult || undefined,
              confidence: nlpResult.confidence
            }
          }
        ],
        isProcessing: false
      }));

      return {
        success: true,
        response: responseContent,
        nlpResult,
        queryResult,
        actionResult
      };

    } catch (error) {
      console.error('Conversation error:', error);
      
      // Remove processing message and add error message
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages.filter(m => !m.processing),
          {
            id: crypto.randomUUID(),
            type: 'assistant',
            content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
            timestamp: new Date(),
            actions: ['Try Again', 'Get Help']
          }
        ],
        isProcessing: false
      }));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [state.conversationId, state.isProcessing]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    conversationManager.current.clearHistory();
    setState({
      messages: [],
      isProcessing: false,
      conversationId: crypto.randomUUID(),
      context: {}
    });
    initializeConversation();
  }, [initializeConversation]);

  // Get smart suggestions based on conversation context
  const getSmartSuggestions = useCallback(() => {
    return conversationManager.current.getSmartSuggestions();
  }, []);

  // Format query response for display
  const formatQueryResponse = (queryResult: QueryResult): string => {
    if (!queryResult || !queryResult.result) return 'No data found.';

    const { result } = queryResult;
    let response = '';

    // Format based on query type
    if (result.tasks) {
      const tasks = result.tasks;
      response = `Found ${tasks.length} tasks. `;
      if (tasks.length > 0) {
        const priorityTasks = tasks.filter((t: any) => t.priority === 'high' || t.priority === 'urgent');
        response += `You have ${priorityTasks.length} high-priority tasks. `;
        response += `Recent tasks: ${tasks.slice(0, 3).map((t: any) => t.title).join(', ')}`;
      }
    }

    if (result.clients) {
      const clients = result.clients;
      response += `You have ${clients.length} clients. `;
      if (result.total_revenue) {
        response += `Total lifetime value: $${result.total_revenue.toLocaleString()}. `;
      }
      if (clients.length > 0) {
        response += `Top clients: ${clients.slice(0, 3).map((c: any) => c.name).join(', ')}`;
      }
    }

    if (result.invoices) {
      const invoices = result.invoices;
      response += `Found ${invoices.length} invoices. `;
      if (result.total_revenue) {
        response += `Total revenue: $${result.total_revenue.toLocaleString()}. `;
      }
      if (result.pending_revenue) {
        response += `Pending payments: $${result.pending_revenue.toLocaleString()}. `;
      }
      if (result.overdue_count > 0) {
        response += `${result.overdue_count} invoices are overdue. `;
      }
    }

    if (result.time_entries) {
      const entries = result.time_entries;
      response += `You have ${entries.length} time entries. `;
      if (result.total_hours) {
        response += `Total time tracked: ${result.total_hours} hours. `;
      }
      if (result.average_session) {
        response += `Average session: ${result.average_session} minutes. `;
      }
    }

    return response || result.summary || 'Data retrieved successfully.';
  };

  return {
    state,
    sendMessage,
    clearConversation,
    initializeConversation,
    getSmartSuggestions,
    conversationManager: conversationManager.current
  };
}
