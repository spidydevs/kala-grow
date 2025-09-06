import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { generateAIContent } from '@/services/aiService'
import { toast } from 'sonner'
import { Brain, Sparkles, Loader2, FileText, Mail, Presentation, Copy, Download } from 'lucide-react'

interface AIContentAssistantProps {
  onContentGenerated?: (content: any) => void
}

interface GeneratedContent {
  type: string
  data: any
}

export function AIContentAssistant({ onContentGenerated }: AIContentAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [requestType, setRequestType] = useState('')
  const [formData, setFormData] = useState({
    context: '',
    clientInfo: '',
    targetAudience: '',
    contentType: '',
    additionalRequirements: ''
  })
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)

  const requestTypes = [
    { value: 'content_strategy', label: 'Content Strategy', icon: Presentation },
    { value: 'email_draft', label: 'Email Draft', icon: Mail },
    { value: 'proposal_outline', label: 'Proposal Outline', icon: FileText }
  ]

  const handleGenerate = async () => {
    if (!requestType || !formData.context.trim()) {
      toast.error('Please select a request type and provide context')
      return
    }

    setIsLoading(true)
    try {
      const response = await generateAIContent({
        requestType,
        context: formData.context,
        clientInfo: formData.clientInfo,
        targetAudience: formData.targetAudience,
        contentType: formData.contentType,
        additionalRequirements: formData.additionalRequirements
      })

      if (response.success) {
        setGeneratedContent({ type: requestType, data: response })
        toast.success('Content generated successfully!')
        onContentGenerated?.(response)
      } else {
        toast.error('Failed to generate content')
      }
    } catch (error) {
      console.error('AI Content Generation Error:', error)
      toast.error('Failed to generate content. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const renderContentStrategy = (data: any) => (
    <div className="space-y-4">
      <Card >
        <CardHeader>
          <CardTitle className="text-lg">Strategy Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">{data.strategy_overview}</p>
        </CardContent>
      </Card>

      <Card >
        <CardHeader>
          <CardTitle className="text-lg">Messaging Pillars</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {data.messaging_pillars?.map((pillar: string, index: number) => (
              <Badge key={index} variant="secondary" className="justify-start">
                {pillar}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card >
        <CardHeader>
          <CardTitle className="text-lg">Content Themes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.content_themes?.map((theme: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold">{theme.theme}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{theme.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {theme.topics?.map((topic: string, topicIndex: number) => (
                    <Badge key={topicIndex} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderEmailDraft = (data: any) => (
    <div className="space-y-4">
      <Card >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Email Draft</CardTitle>
            <Button variant="outline"  onClick={() => handleCopy(`Subject: ${data.subject}\n\n${data.body}`)}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Subject Line:</Label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium">{data.subject}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-semibold">Email Body:</Label>
            <div className="mt-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <pre className="whitespace-pre-wrap font-sans text-sm">{data.body}</pre>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-semibold">Call to Action:</Label>
            <div className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
              <p className="text-green-800 dark:text-green-200">{data.call_to_action}</p>
            </div>
          </div>
          
          {data.tone_notes && (
            <div>
              <Label className="text-sm font-semibold">Tone Guidance:</Label>
              <div className="mt-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">{data.tone_notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderProposalOutline = (data: any) => (
    <div className="space-y-4">
      <Card >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Proposal Outline</CardTitle>
            <Button variant="outline"  onClick={() => handleCopy(JSON.stringify(data, null, 2))}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.sections?.map((section: any, index: number) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-2">{section.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{section.description}</p>
                
                {section.key_points && (
                  <div>
                    <Label className="text-sm font-semibold">Key Points:</Label>
                    <ul className="mt-2 space-y-1">
                      {section.key_points.map((point: string, pointIndex: number) => (
                        <li key={pointIndex} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderGeneratedContent = () => {
    if (!generatedContent) return null

    switch (generatedContent.type) {
      case 'content_strategy':
        return renderContentStrategy(generatedContent.data)
      case 'email_draft':
        return renderEmailDraft(generatedContent.data)
      case 'proposal_outline':
        return renderProposalOutline(generatedContent.data)
      default:
        return (
          <Card >
            <CardContent className="p-4">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(generatedContent.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-green-600 to-green-600 hover:from-green-700 hover:to-green-700 text-white"
      >
        <Brain className="h-4 w-4 mr-2" />
        AI Content Assistant
      </Button>
    )
  }

  return (
    <Card  className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            <CardTitle>AI Content Assistant</CardTitle>
          </div>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            ×
          </Button>
        </div>
        <CardDescription>
          Generate content strategies, email drafts, and proposal outlines using AI
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Request Type Selection */}
        <div>
          <Label htmlFor="type">Content Type *</Label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-900 appearance-none"
          >
            <option value="">Select content type to generate</option>
            {requestTypes.map(type => {
              const Icon = type.icon
              return (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              )
            })}
          </select>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="context">Context / Purpose *</Label>
            <Textarea
              id="context"
              placeholder="Describe what you need help with, the project context, goals..."
              value={formData.context}
              onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="clientInfo">Client Information</Label>
            <Textarea
              id="clientInfo"
              placeholder="Client background, industry, company size..."
              value={formData.clientInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, clientInfo: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Textarea
              id="targetAudience"
              placeholder="Demographics, interests, pain points..."
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="contentType">Content Format</Label>
            <Input
              id="contentType"
              placeholder="e.g., blog posts, social media, video, webinar"
              value={formData.contentType}
              onChange={(e) => setFormData(prev => ({ ...prev, contentType: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="additionalRequirements">Additional Requirements</Label>
            <Textarea
              id="additionalRequirements"
              placeholder="Special considerations, constraints, or preferences..."
              value={formData.additionalRequirements}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalRequirements: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading || !requestType}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Generate Content
          </Button>
        </div>

        {/* Generated Content */}
        {generatedContent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Content</h3>
            </div>
            {renderGeneratedContent()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}