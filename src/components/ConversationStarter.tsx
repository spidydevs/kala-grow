import React, { useState } from 'react';
import { MessageSquare, Mic, Zap, TrendingUp, Users, DollarSign, Clock } from 'lucide-react';

interface ConversationStarterProps {
  onStartConversation: (message: string) => void;
  className?: string;
}

interface QuickAction {
  category: string;
  icon: React.ReactNode;
  color: string;
  suggestions: string[];
}

export function ConversationStarter({ onStartConversation, className = '' }: ConversationStarterProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const quickActions: QuickAction[] = [
    {
      category: 'Tasks & Projects',
      icon: <Zap className="w-5 h-5" />,
      color: 'bg-blue-500',
      suggestions: [
        'Show me my tasks for today',
        'Create a task to review the marketing proposal',
        'What are my overdue tasks?',
        'Mark the client presentation as complete',
        'Show me tasks with high priority'
      ]
    },
    {
      category: 'Analytics & Reports',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'bg-green-500',
      suggestions: [
        'Show me this month\'s revenue',
        'What\'s my productivity this week?',
        'Generate a client revenue report',
        'Show me time tracking analytics',
        'Which projects are most profitable?'
      ]
    },
    {
      category: 'Client Management',
      icon: <Users className="w-5 h-5" />,
      color: 'bg-purple-500',
      suggestions: [
        'Show me my top 5 clients',
        'Add a new client called TechCorp',
        'When did I last contact Sarah Johnson?',
        'Show clients with outstanding invoices',
        'Create a follow-up reminder for ABC Company'
      ]
    },
    {
      category: 'Finance & Invoicing',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'bg-yellow-500',
      suggestions: [
        'Create an invoice for $2,500',
        'Show me pending payments',
        'What\'s my revenue this quarter?',
        'Mark invoice #1234 as paid',
        'Show me overdue invoices'
      ]
    },
    {
      category: 'Time Tracking',
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-red-500',
      suggestions: [
        'Start a timer for client work',
        'How many hours did I work today?',
        'Stop the current timer',
        'Show me time entries for this week',
        'Log 2 hours for project research'
      ]
    }
  ];

  const handleSuggestionClick = (suggestion: string) => {
    onStartConversation(suggestion);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Start a Conversation</h2>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Ask me anything about your productivity data, or try one of these quick actions to get started.
        </p>
      </div>

      {/* Voice Prompt */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center space-x-3 mb-3">
          <Mic className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Try Voice Commands</h3>
        </div>
        <p className="text-blue-800 mb-4">
          Click the microphone button and speak naturally. For example:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-700">"Show me my tasks for today"</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-700">"How much revenue this month?"</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-700">"Create a task to call John"</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-700">"Start a timer for design work"</span>
          </div>
        </div>
      </div>

      {/* Quick Action Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${action.color} text-white`}>
                  {action.icon}
                </div>
                <h3 className="font-semibold text-gray-900">{action.category}</h3>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {action.suggestions.slice(0, 3).map((suggestion, suggestionIndex) => (
                <button
                  key={suggestionIndex}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <span className="group-hover:text-blue-600">"{suggestion}"</span>
                </button>
              ))}
              
              {action.suggestions.length > 3 && (
                <button
                  onClick={() => setSelectedCategory(selectedCategory === action.category ? null : action.category)}
                  className="w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  {selectedCategory === action.category ? 'Show less' : `+${action.suggestions.length - 3} more`}
                </button>
              )}
              
              {/* Expanded suggestions */}
              {selectedCategory === action.category && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {action.suggestions.slice(3).map((suggestion, suggestionIndex) => (
                    <button
                      key={suggestionIndex + 3}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                      <span className="group-hover:text-blue-600">"{suggestion}"</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Popular Commands */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Commands</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Show me my dashboard overview',
            'What\'s my biggest client by revenue?',
            'Create a high priority task',
            'How productive was I yesterday?',
            'Show me this week\'s time summary',
            'Which invoices are overdue?'
          ].map((command, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(command)}
              className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group text-left"
            >
              <MessageSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700 group-hover:text-blue-700">{command}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}