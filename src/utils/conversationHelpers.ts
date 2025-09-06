export interface ConversationContext {
  currentTopic?: string;
  lastIntent?: string;
  userPreferences?: Record<string, any>;
  activeModule?: string;
  conversationFlow?: string[];
}

export interface NLPResult {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  action_type?: string;
  query_type?: string;
  parameters: Record<string, any>;
  response_text: string;
  requires_confirmation?: boolean;
  suggested_actions?: string[];
  context_update?: Record<string, any>;
}

export interface QueryResult {
  query_type: string;
  result: any;
  visualization?: any;
  summary: string;
  processing_time_ms: number;
  timestamp: string;
}

export interface ActionResult {
  action_type: string;
  result: any;
  success_message: string;
  follow_up_actions: string[];
  processing_time_ms: number;
  timestamp: string;
}

export class ConversationManager {
  private context: ConversationContext = {};
  private history: Array<{ type: 'user' | 'assistant'; content: string; timestamp: Date }> = [];

  updateContext(updates: Partial<ConversationContext>) {
    this.context = { ...this.context, ...updates };
  }

  getContext(): ConversationContext {
    return this.context;
  }

  addToHistory(type: 'user' | 'assistant', content: string) {
    this.history.push({
      type,
      content,
      timestamp: new Date()
    });
    
    // Keep only last 20 messages
    if (this.history.length > 20) {
      this.history = this.history.slice(-20);
    }
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    this.context = {};
  }

  // Smart suggestions based on context and history
  getSmartSuggestions(): string[] {
    const suggestions: string[] = [];
    const recentIntents = this.history
      .filter(h => h.type === 'user')
      .slice(-5)
      .map(h => this.extractIntent(h.content));

    // Task-related suggestions
    if (recentIntents.includes('tasks') || this.context.activeModule === 'tasks') {
      suggestions.push('Show my overdue tasks', 'Create a new task', 'Mark task as complete');
    }

    // CRM suggestions
    if (recentIntents.includes('clients') || this.context.activeModule === 'crm') {
      suggestions.push('Show my top clients', 'Add a new client', 'View recent deals');
    }

    // Financial suggestions
    if (recentIntents.includes('finance') || this.context.activeModule === 'finance') {
      suggestions.push('Show pending invoices', 'Create an invoice', 'Revenue this month');
    }

    // Time tracking suggestions
    if (recentIntents.includes('time') || this.context.activeModule === 'time') {
      suggestions.push('Start a timer', 'Show today\'s time entries', 'Time report for this week');
    }

    // General suggestions if no specific context
    if (suggestions.length === 0) {
      suggestions.push(
        'Show me my dashboard',
        'What tasks do I have today?',
        'How much revenue this month?',
        'Start a timer for client work'
      );
    }

    return suggestions.slice(0, 4); // Return max 4 suggestions
  }

  private extractIntent(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('task')) return 'tasks';
    if (lower.includes('client') || lower.includes('customer')) return 'clients';
    if (lower.includes('invoice') || lower.includes('revenue') || lower.includes('payment')) return 'finance';
    if (lower.includes('time') || lower.includes('timer') || lower.includes('track')) return 'time';
    return 'general';
  }
}

// Utility functions for formatting responses
export const formatters = {
  currency: (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  },

  duration: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${hours} hours`;
  },

  date: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  percentage: (value: number): string => {
    return `${Math.round(value * 100)}%`;
  },

  listItems: (items: string[], maxItems: number = 3): string => {
    if (items.length <= maxItems) {
      return items.join(', ');
    }
    return `${items.slice(0, maxItems).join(', ')} and ${items.length - maxItems} more`;
  }
};

// Intent classification helpers
export const intentClassifiers = {
  isTaskRelated: (text: string): boolean => {
    const taskKeywords = ['task', 'todo', 'assignment', 'work', 'project', 'deadline', 'priority'];
    return taskKeywords.some(keyword => text.toLowerCase().includes(keyword));
  },

  isCRMRelated: (text: string): boolean => {
    const crmKeywords = ['client', 'customer', 'deal', 'contact', 'lead', 'prospect', 'relationship'];
    return crmKeywords.some(keyword => text.toLowerCase().includes(keyword));
  },

  isFinanceRelated: (text: string): boolean => {
    const financeKeywords = ['invoice', 'payment', 'revenue', 'money', 'billing', 'cost', 'price', 'budget'];
    return financeKeywords.some(keyword => text.toLowerCase().includes(keyword));
  },

  isTimeRelated: (text: string): boolean => {
    const timeKeywords = ['time', 'timer', 'track', 'hours', 'minutes', 'duration', 'log'];
    return timeKeywords.some(keyword => text.toLowerCase().includes(keyword));
  },

  isAnalyticsRelated: (text: string): boolean => {
    const analyticsKeywords = ['analytics', 'report', 'stats', 'statistics', 'summary', 'overview', 'insights'];
    return analyticsKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }
};

// Voice command preprocessing
export const voiceHelpers = {
  normalizeVoiceInput: (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?;]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  },

  extractVoiceCommands: (text: string): { command: string; parameters: string[] } => {
    const normalized = voiceHelpers.normalizeVoiceInput(text);
    const words = normalized.split(' ');
    
    // Common command patterns
    const commandPatterns = {
      show: ['show', 'display', 'view', 'list'],
      create: ['create', 'add', 'new', 'make'],
      update: ['update', 'edit', 'change', 'modify'],
      delete: ['delete', 'remove', 'cancel'],
      start: ['start', 'begin', 'initiate'],
      stop: ['stop', 'end', 'finish', 'complete']
    };
    
    let detectedCommand = 'unknown';
    for (const [command, patterns] of Object.entries(commandPatterns)) {
      if (patterns.some(pattern => words.includes(pattern))) {
        detectedCommand = command;
        break;
      }
    }
    
    return {
      command: detectedCommand,
      parameters: words
    };
  },

  generateVoiceResponse: (text: string): string => {
    // Make text more suitable for speech synthesis
    return text
      .replace(/\$([0-9,]+)/g, '$1 dollars') // Convert currency
      .replace(/([0-9]+)%/g, '$1 percent') // Convert percentages
      .replace(/\b(\d+)h\s*(\d+)m/g, '$1 hours and $2 minutes') // Convert time format
      .replace(/\b(\d+)\.(\d+)\b/g, '$1 point $2'); // Convert decimals
  }
};