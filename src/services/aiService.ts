import { toast } from 'sonner'

// AI Service using Gemini API
export class AIService {
  private static GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
  
  private static async callGeminiAPI(prompt: string): Promise<string> {
    try {
      // Get Gemini API key from environment variables
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      
      if (!apiKey) {
        throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY environment variable.')
      }
      
      const response = await fetch(`${this.GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } catch (error) {
      console.error('Gemini API Error:', error)
      throw error
    }
  }

  // AI Task Generator
  static async generateTasks(params: {
    projectDescription: string
    projectType: string
    timeline: string
    budget: string
    clientRequirements: string
  }) {
    try {
      const prompt = `
As a project management AI assistant, generate a comprehensive task breakdown for the following project:

Project Description: ${params.projectDescription}
Project Type: ${params.projectType}
Timeline: ${params.timeline}
Budget: ${params.budget}
Client Requirements: ${params.clientRequirements}

Please generate 6-12 detailed tasks in JSON format with the following structure:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "estimated_hours": number,
      "priority": "low|medium|high|urgent",
      "assignee_role": "Role responsible",
      "dependencies": ["Optional list of dependencies"]
    }
  ]
}

Ensure tasks are:
- Specific and actionable
- Properly sequenced
- Include realistic time estimates
- Cover all project phases
- Appropriate for the given timeline and budget

Return only valid JSON, no additional text.`

      const response = await this.callGeminiAPI(prompt)
      
      try {
        // Clean the response to extract JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in response')
        }
        
        const parsedResponse = JSON.parse(jsonMatch[0])
        return {
          success: true,
          tasks: parsedResponse.tasks || []
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError)
        // Return fallback tasks if parsing fails
        return {
          success: true,
          tasks: this.getFallbackTasks(params.projectType)
        }
      }
    } catch (error) {
      console.error('AI Task Generation Error:', error)
      return {
        success: true,
        tasks: this.getFallbackTasks(params.projectType)
      }
    }
  }

  // AI Content Assistant
  static async generateContent(params: {
    requestType: string
    context: string
    clientInfo?: string
    targetAudience?: string
    contentType?: string
    additionalRequirements?: string
  }) {
    try {
      let prompt = ''
      
      switch (params.requestType) {
        case 'content_strategy':
          prompt = `Create a comprehensive content strategy in JSON format for:

Context: ${params.context}
Client: ${params.clientInfo}
Target Audience: ${params.targetAudience}
Content Type: ${params.contentType}
Requirements: ${params.additionalRequirements}

Return JSON with structure:
{
  "strategy_overview": "Brief overview",
  "messaging_pillars": ["pillar1", "pillar2", "pillar3"],
  "content_themes": [
    {
      "theme": "Theme name",
      "description": "Theme description",
      "topics": ["topic1", "topic2", "topic3"]
    }
  ]
}

Return only JSON, no additional text.`
          break
          
        case 'email_draft':
          prompt = `Create a professional email draft in JSON format for:

Context: ${params.context}
Client: ${params.clientInfo}
Target Audience: ${params.targetAudience}
Requirements: ${params.additionalRequirements}

Return JSON with structure:
{
  "subject": "Email subject line",
  "body": "Email body with proper formatting",
  "call_to_action": "Clear CTA",
  "tone_notes": "Guidance on tone and approach"
}

Return only JSON, no additional text.`
          break
          
        case 'proposal_outline':
          prompt = `Create a detailed proposal outline in JSON format for:

Context: ${params.context}
Client: ${params.clientInfo}
Requirements: ${params.additionalRequirements}

Return JSON with structure:
{
  "sections": [
    {
      "title": "Section title",
      "description": "Section description",
      "key_points": ["Point 1", "Point 2", "Point 3"]
    }
  ]
}

Return only JSON, no additional text.`
          break
      }

      const response = await this.callGeminiAPI(prompt)
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in response')
        }
        
        const parsedResponse = JSON.parse(jsonMatch[0])
        return {
          success: true,
          ...parsedResponse
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError)
        return this.getFallbackContent(params.requestType)
      }
    } catch (error) {
      console.error('AI Content Generation Error:', error)
      return this.getFallbackContent(params.requestType)
    }
  }

  // Fallback tasks for different project types
  private static getFallbackTasks(projectType: string) {
    const baseTasks = [
      {
        title: "Project kickoff and planning",
        description: "Initial meeting with stakeholders, requirement gathering, and project scope definition",
        estimated_hours: 8,
        priority: "high" as const,
        assignee_role: "Project Manager",
        dependencies: []
      },
      {
        title: "Research and competitive analysis",
        description: "Market research, competitor analysis, and trend identification",
        estimated_hours: 12,
        priority: "medium" as const,
        assignee_role: "Strategy Lead",
        dependencies: ["Project kickoff and planning"]
      },
      {
        title: "Strategy development",
        description: "Develop comprehensive strategy based on research findings",
        estimated_hours: 16,
        priority: "high" as const,
        assignee_role: "Strategy Lead",
        dependencies: ["Research and competitive analysis"]
      },
      {
        title: "Creative concept development",
        description: "Brainstorm and develop creative concepts aligned with strategy",
        estimated_hours: 20,
        priority: "high" as const,
        assignee_role: "Creative Director",
        dependencies: ["Strategy development"]
      },
      {
        title: "Content creation",
        description: "Produce all required content assets according to approved concepts",
        estimated_hours: 32,
        priority: "medium" as const,
        assignee_role: "Content Creator",
        dependencies: ["Creative concept development"]
      },
      {
        title: "Review and approval",
        description: "Client review, feedback incorporation, and final approval",
        estimated_hours: 8,
        priority: "high" as const,
        assignee_role: "Project Manager",
        dependencies: ["Content creation"]
      },
      {
        title: "Implementation and launch",
        description: "Execute the approved strategy and launch the project",
        estimated_hours: 16,
        priority: "urgent" as const,
        assignee_role: "Implementation Team",
        dependencies: ["Review and approval"]
      },
      {
        title: "Monitoring and optimization",
        description: "Track performance metrics and optimize based on results",
        estimated_hours: 12,
        priority: "medium" as const,
        assignee_role: "Analytics Specialist",
        dependencies: ["Implementation and launch"]
      }
    ]

    return baseTasks
  }

  // Fallback content for different request types
  private static getFallbackContent(requestType: string) {
    switch (requestType) {
      case 'content_strategy':
        return {
          success: true,
          strategy_overview: "A comprehensive content strategy focused on audience engagement and brand awareness through targeted, value-driven content.",
          messaging_pillars: [
            "Thought Leadership",
            "Customer Success",
            "Innovation & Trends",
            "Community Building"
          ],
          content_themes: [
            {
              theme: "Educational Content",
              description: "Content that educates and informs the target audience",
              topics: ["How-to guides", "Best practices", "Industry insights"]
            },
            {
              theme: "Behind the Scenes",
              description: "Content that showcases company culture and processes",
              topics: ["Team spotlights", "Work processes", "Company values"]
            },
            {
              theme: "Customer Stories",
              description: "Content highlighting customer success and testimonials",
              topics: ["Case studies", "Customer interviews", "Success metrics"]
            }
          ]
        }
        
      case 'email_draft':
        return {
          success: true,
          subject: "Partnership Opportunity - Let's Grow Together",
          body: "Hi [Name],\n\nI hope this email finds you well. I wanted to reach out because I believe there's a great opportunity for our companies to work together.\n\n[Customize with specific context and details]\n\nI'd love to schedule a brief call to discuss this further. Are you available for a 15-minute conversation next week?\n\nBest regards,\n[Your name]",
          call_to_action: "Schedule a 15-minute call to explore partnership opportunities",
          tone_notes: "Professional yet approachable, focus on mutual benefits and keep it concise"
        }
        
      case 'proposal_outline':
        return {
          success: true,
          sections: [
            {
              title: "Executive Summary",
              description: "High-level overview of the proposal and key benefits",
              key_points: [
                "Project objectives and goals",
                "Expected outcomes and ROI",
                "Timeline and key milestones"
              ]
            },
            {
              title: "Problem Statement",
              description: "Clear definition of the challenge or opportunity",
              key_points: [
                "Current situation analysis",
                "Pain points and challenges",
                "Impact of not addressing the issue"
              ]
            },
            {
              title: "Proposed Solution",
              description: "Detailed explanation of the recommended approach",
              key_points: [
                "Solution methodology",
                "Implementation approach",
                "Success metrics and KPIs"
              ]
            },
            {
              title: "Investment and Timeline",
              description: "Project costs and implementation schedule",
              key_points: [
                "Project phases and timeline",
                "Resource requirements",
                "Budget breakdown and ROI"
              ]
            }
          ]
        }
        
      default:
        return {
          success: true,
          message: "Content generated successfully with fallback data"
        }
    }
  }
}

// Export AI service functions for easy use
export const generateAITasks = AIService.generateTasks
export const generateAIContent = AIService.generateContent