import { useState, useRef, useEffect } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Upload,
  Send,
  FileText,
  Bot,
  User,
  Download,
  Eye,
  MessageSquare,
  Loader2,
  ArrowRight,
} from "lucide-react"
import { startInterview } from "@/services/api"
import type { StartInterviewRequest } from "@/types/interview.types"

// API service
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ResumeFile {
  name: string
  size: number
  type: string
  url: string
}

interface SectionDetail {
  score?: number
  feedback?: string
  works_well?: string
  improvement_suggestions?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  example_phrasing?: any
}

interface ResumeSummary {
  session_id: string
  overall_assessment: {
    summary: string
    grade: string
    market_readiness: string
  }
  first_impression_analysis: {
    contact_clarity: string
    professional_summary: string
    immediate_highlights: string
    red_flags: string[]
  }
  section_feedback: {
    experience: SectionDetail | string
    skills: SectionDetail | string
    education: SectionDetail | string
    projects?: SectionDetail | string
  }
  market_positioning: {
    target_companies: string
    salary_expectations: string
    skill_priorities: string
  }
  actionable_improvements: {
    area: string
    suggestion: string
    example: string
  }[]
  potential_questions?: {
    id: string
    question: string
    type: string
    difficulty: string
  }[]
}

// Helper: section_feedback values can be strings or objects; extract readable text
function sectionText(val: SectionDetail | string | undefined): string {
  if (!val) return 'N/A'
  if (typeof val === 'string') return val
  return val.feedback || val.works_well || 'N/A'
}

function sectionScore(val: SectionDetail | string | undefined): number | null {
  if (!val || typeof val === 'string') return null
  return val.score ?? null
}

// Feedback Overview Component
const FeedbackOverview = ({ summary }: { summary: ResumeSummary }) => {
  if (!summary) return null

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Overall Assessment */}
      <div className="bg-white rounded-lg p-3 shadow-sm border">
        <h3 className="text-base font-semibold mb-2">Overall Assessment</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
            Grade: {summary.overall_assessment?.grade || 'N/A'}
          </span>
          <span className="text-sm text-muted-foreground">
            {summary.overall_assessment?.market_readiness || 'N/A'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{summary.overall_assessment?.summary || 'No summary available'}</p>
      </div>

      {/* First Impression */}
      <div className="bg-white rounded-lg p-3 shadow-sm border">
        <h3 className="text-base font-semibold mb-2">First Impression</h3>
        <div className="space-y-1 text-sm">
          <div><strong>Contact:</strong> {summary.first_impression_analysis?.contact_clarity || 'N/A'}</div>
          <div><strong>Summary:</strong> {summary.first_impression_analysis?.professional_summary || 'N/A'}</div>
          <div><strong>Highlights:</strong> {summary.first_impression_analysis?.immediate_highlights || 'N/A'}</div>
        </div>
      </div>

      {/* Section Feedback */}
      <div className="bg-white rounded-lg p-3 shadow-sm border">
        <h3 className="text-base font-semibold mb-2">Section Feedback</h3>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {(['experience', 'skills', 'education', 'projects'] as const).map((key) => {
            const val = summary.section_feedback?.[key as keyof typeof summary.section_feedback]
            const score = sectionScore(val)
            return (
              <div key={key}>
                <strong className="capitalize">{key}:</strong>
                {score !== null && (
                  <span className="ml-1 text-xs text-muted-foreground">({score}/10)</span>
                )}
                <span className="ml-1">{sectionText(val)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Improvements */}
      <div className="bg-white rounded-lg p-3 shadow-sm border">
        <h3 className="text-base font-semibold mb-2">Top Improvements</h3>
        <div className="space-y-2">
          {summary.actionable_improvements?.slice(0, 3).map((improvement, idx) => (
            <div key={idx} className="border-l-2 border-blue-500 pl-2">
              <div className="font-medium text-sm">{improvement.area}</div>
              <div className="text-sm text-muted-foreground">{improvement.suggestion}</div>
            </div>
          )) || <div className="text-sm text-muted-foreground">No improvements identified</div>}
        </div>
      </div>
    </div>
  )
}

// Potential Questions Section Component
const PotentialQuestionsSection = ({
  questions,
  onProceed,
}: {
  questions: any[]
  onProceed: () => void
}) => {
  return (
    <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Potential Interview Questions</h3>
        <span className="text-sm text-muted-foreground">
          Based on your resume analysis
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {questions.map((question: any, index: number) => (
          <div key={question.id} className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {question.type} • {question.difficulty}
              </span>
              <Badge variant="outline" className="text-xs">
                Q{index + 1}
              </Badge>
            </div>
            <p className="text-sm">{question.question}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Button className="flex items-center gap-2" onClick={onProceed}>
          Proceed to Interview
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function ResumePage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId?: string }>()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI resume assistant. Upload your resume and I'll analyze it for the Malaysian tech job market. After analysis, you can ask me specific questions about your resume, and I'll query the document directly to give you accurate answers!",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resumeSession, setResumeSession] = useState<string | null>(null)
  const [resumeSummary, setResumeSummary] = useState<ResumeSummary | null>(null)
  const [resumeFile, setResumeFile] = useState<ResumeFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [targetPosition, setTargetPosition] = useState("Software Engineer")
  const [targetCompanies, setTargetCompanies] = useState<string[]>(["Grab", "Shopee", "Google"])
  const [customCompany, setCustomCompany] = useState("")
  const [potentialQuestions, setPotentialQuestions] = useState<any[]>([])
  const [showProceedDialog, setShowProceedDialog] = useState(false)
  const [proceedName, setProceedName] = useState("")
  const [isProceedLoading, setIsProceedLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load sessionId from URL if present
  useEffect(() => {
    if (sessionId) {
      setResumeSession(sessionId)
      // Optionally load existing analysis data here if needed
    }
  }, [sessionId])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if it's a PDF
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file")
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("target_position", targetPosition)
      formData.append("target_companies", targetCompanies.join(","))

      const response = await fetch(`${API_BASE_URL}/api/v1/resume/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("Upload result:", result)
      
      setResumeSession(result.session_id)
      setResumeSummary(result.analysis_result)
      console.log("Resume summary set:", result.analysis_result)
      
      // Set potential questions if available
      if (result.analysis_result?.potential_questions) {
        setPotentialQuestions(result.analysis_result.potential_questions)
      }
      
      setResumeFile({
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      })

      // Update URL to include resume sessionId
      navigate(`/resume/${result.session_id}`, { replace: true })

      // Add upload success message with structured overview
      const uploadMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Great! I've uploaded and analyzed your resume "${file.name}". Here's your comprehensive feedback:`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, uploadMessage])

    } catch (error) {
      console.error("Upload error:", error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Sorry, I encountered an error uploading your resume: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !resumeSession) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      // Query the PDF directly using a chat endpoint
      const response = await fetch(`${API_BASE_URL}/api/v1/resume/chat/${resumeSession}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Chat query failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.response || "I'm sorry, I couldn't process your question about the resume.",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiResponse])

    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleProceedToInterview = async () => {
    if (!proceedName.trim() || !resumeSession) return
    setIsProceedLoading(true)
    try {
      const request: StartInterviewRequest = {
        candidate_name: proceedName.trim(),
        company: targetCompanies[0] || "Generic Tech",
        position: targetPosition,
        question_types: ["behavioral"],
        question_count: Math.min(Math.max(potentialQuestions.length, 3), 10),
        resume_session_id: resumeSession,
      }
      const response = await startInterview(request)
      navigate(`/interview/${response.session_id}?resume=${resumeSession}`)
    } catch (err) {
      console.error("Failed to start interview:", err)
    } finally {
      setIsProceedLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="container h-screen py-4 max-w-7xl">
      {/* Header */}
      <div className="bg-white border-b p-4 mb-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </Button>
          </Link>
          
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Role:</span>
              <Select value={targetPosition} onValueChange={setTargetPosition}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                  <SelectItem value="Data Scientist">Data Scientist</SelectItem>
                  <SelectItem value="Product Manager">Product Manager</SelectItem>
                  <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                  <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Company Multi-Select */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Companies:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {targetCompanies.map((company, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
                    {company}
                    <button 
                      onClick={() => {
                        const newCompanies = targetCompanies.filter((_, i) => i !== index)
                        setTargetCompanies(newCompanies)
                      }}
                      className="ml-1 text-xs hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add company..."
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && customCompany.trim()) {
                    e.preventDefault()
                    setTargetCompanies([...targetCompanies, customCompany.trim()])
                    setCustomCompany("")
                  }
                }}
                className="w-32 h-8 text-sm"
              />
            </div>
            
            {resumeSession && (
              <Badge variant="outline" className="ml-auto">Session: {resumeSession.slice(0, 8)}...</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[calc(100vh-8rem)]">
        {/* Resume Viewer */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resume Viewer
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {resumeFile ? (
              <div className="flex-1 flex flex-col">
                {/* File Info Bar */}
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{resumeFile.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(resumeFile.size)}
                      </Badge>
                      {resumeSummary && (
                        <Badge variant="default" className="text-xs">
                          {resumeSummary.overall_assessment?.grade || 'N/A'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={resumeFile.url}
                          download={resumeFile.name}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={resumeFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* PDF Viewer */}
                <div className="flex-1 bg-muted/20">
                  <iframe
                    src={resumeFile.url}
                    className="w-full h-full border-0"
                    title="Resume Viewer"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Upload Your Resume</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a PDF file to get started with AI-powered resume analysis
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose PDF File
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Resume Assistant
              {resumeSummary && (
                <Badge variant="default" className="ml-auto">
                  {resumeSummary.overall_assessment?.grade || 'N/A'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto max-h-[680px]">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 mb-4 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted mr-auto"
                      }`}
                    >
                      <div className="prose prose-sm max-w-none [&_strong]:text-primary [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_ul]:list-disc [&_li]:my-1 [&_p]:text-sm [&_code]:bg-muted px-2 py-1 rounded text-xs">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {/* Show FeedbackOverview after initial analysis message */}
                      {(() => {
                        const shouldShow = message.content.includes("comprehensive feedback") && resumeSummary;
                        console.log("Should show FeedbackOverview:", shouldShow, "Message content:", message.content, "Has summary:", !!resumeSummary);
                        return shouldShow;
                      })() && resumeSummary && (
                        <div className="mt-4">
                          <FeedbackOverview summary={resumeSummary} />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-background/95">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    resumeSession
                      ? "Ask about your resume analysis..."
                      : "Upload a resume first to start chatting..."
                  }
                  disabled={!resumeSession || isLoading}
                  className="flex-1 h-12 resize-none"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || !resumeSession || isLoading}
                  size="icon"
                  className="h-12 aspect-square"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Potential Questions Section */}
      {potentialQuestions.length > 0 && (
        <PotentialQuestionsSection
          questions={potentialQuestions}
          onProceed={() => setShowProceedDialog(true)}
        />
      )}

      {/* Proceed to Interview Dialog */}
      {showProceedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-1">Start Interview</h2>
            <p className="text-sm text-muted-foreground mb-4">
              We'll use the questions generated from your resume. Enter your name to begin.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="proceed-name">Your Name</Label>
                <Input
                  id="proceed-name"
                  placeholder="Enter your name"
                  value={proceedName}
                  onChange={(e) => setProceedName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleProceedToInterview()}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Role:</span> {targetPosition} &nbsp;|&nbsp;
                <span className="font-medium">Questions:</span> {potentialQuestions.length}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowProceedDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!proceedName.trim() || isProceedLoading}
                  onClick={handleProceedToInterview}
                >
                  {isProceedLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      Start Interview
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
