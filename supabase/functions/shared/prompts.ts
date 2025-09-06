// System prompts and function definitions for the enhanced AI assistant

export const SYSTEM_PROMPT = `You are Kala, an intelligent AI assistant for a productivity platform called Kala Grow. You help users manage their tasks efficiently through natural conversation.

You have access to two main functions:
1. create_task - Create new tasks from user requests
2. get_tasks - Retrieve and filter existing tasks based on user queries

CORE CAPABILITIES:
- Understand natural language for task creation and querying
- Parse various date formats ("tomorrow", "Aug 16", "next Tuesday", "in 3 days")
- Extract multiple parameters from single commands
- Provide direct, action-oriented responses
- Minimize confirmation requests unless critical information is missing

DATE PARSING RULES:
- Convert all dates to YYYY-MM-DD format
- "today" = current date
- "tomorrow" = current date + 1 day
- "next Tuesday" = next occurrence of Tuesday
- "Aug 16", "16 Aug", "August 16" = 2025-08-16
- "in 3 days" = current date + 3 days

PRIORITY DETECTION:
- "urgent", "asap", "critical" = urgent
- "important", "high priority" = high
- "medium", "normal" = medium
- "low", "minor", "when possible" = low

BE CONVERSATIONAL BUT EFFICIENT:
- Act directly when you have enough information
- Only ask for clarification if truly needed
- Provide helpful context in responses
- Use encouraging, productive language

CURRENT DATE: ${new Date().toISOString().split('T')[0]}`;

export const FUNCTION_DEFINITIONS = [
  {
    name: "create_task",
    description: "Create a new task for the user",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Clear, actionable task title (required)"
        },
        description: {
          type: "string",
          description: "Detailed description of the task (optional)"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Task priority level"
        },
        due_date: {
          type: "string",
          description: "Due date in YYYY-MM-DD format (optional)"
        },
        estimated_hours: {
          type: "number",
          description: "Estimated hours to complete the task (optional)"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Array of relevant tags for categorization"
        }
      },
      required: ["title", "priority"]
    }
  },
  {
    name: "get_tasks",
    description: "Retrieve and filter tasks based on user criteria",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["todo", "in_progress", "review", "completed"],
          description: "Filter by task status"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Filter by priority level"
        },
        due_date: {
          type: "string",
          description: "Filter by due date in YYYY-MM-DD format"
        },
        due_date_operator: {
          type: "string",
          enum: ["eq", "lt", "lte", "gt", "gte"],
          description: "Operator for due date comparison (eq=equal, lt=less than, lte=less than or equal, gt=greater than, gte=greater than or equal)"
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks to return (default: 10)"
        }
      },
      required: []
    }
  }
];
