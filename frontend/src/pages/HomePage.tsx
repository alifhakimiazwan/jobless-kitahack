import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { startInterview, getCompanies, getPositions } from "@/services/api"
import type { QuestionType, StartInterviewRequest } from "@/types/interview.types"
import { Briefcase, Mic, BarChart3, Loader2, FileText, ChevronDown, ChevronUp } from "lucide-react"

const TOP_COMPANIES = ["Grab", "Shopee", "Google", "TNG Digital", "Petronas Digital", "AirAsia"]
const GENERIC_COMPANIES = ["Generic Tech", "Generic Non-Tech"]

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "behavioral", label: "Behavioral" },
  { value: "technical", label: "Technical" },
  { value: "situational", label: "Situational" },
  { value: "system_design", label: "System Design" },
  { value: "product", label: "Product" },
]

export default function SetupPage() {
  const navigate = useNavigate()
  const [candidateName, setCandidateName] = useState("")
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(["behavioral"])
  const [questionCount, setQuestionCount] = useState("5")
  const [companies, setCompanies] = useState<string[]>([])
  const [positions, setPositions] = useState<string[]>([])
  const [jobDescription, setJobDescription] = useState("")
  const [showJD, setShowJD] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isGeneric = company.startsWith("Generic")

  useEffect(() => {
    getCompanies()
      .then(setCompanies)
      .catch(() => setCompanies([...TOP_COMPANIES, ...GENERIC_COMPANIES]))
  }, [])

  useEffect(() => {
    if (company && !isGeneric) {
      getPositions(company)
        .then(setPositions)
        .catch(() => setPositions(["Software Engineer", "Product Manager", "Data Analyst"]))
    }
  }, [company, isGeneric])

  const handleCompanyChange = (v: string) => {
    const wasGeneric = company.startsWith("Generic")
    const nowGeneric = v.startsWith("Generic")
    setCompany(v)
    setPosition("")
    if (wasGeneric && !nowGeneric) {
      setJobDescription("")
      setShowJD(false)
    }
    if (nowGeneric) {
      setShowJD(true)
    }
  }

  const toggleQuestionType = (type: QuestionType) => {
    setQuestionTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    )
  }

  const handleStart = async () => {
    if (!candidateName || !company || !position) {
      setError("Please fill in all required fields")
      return
    }
    if (questionTypes.length === 0) {
      setError("Please select at least one question type")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const request: StartInterviewRequest = {
        candidate_name: candidateName,
        company,
        position,
        question_types: questionTypes,
        question_count: parseInt(questionCount),
        ...(jobDescription.trim() && { job_description: jobDescription.trim() }),
      }

      const response = await startInterview(request)
      navigate(`/interview/${response.session_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start interview")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Practice Interviews with AI
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get ready for your dream job at top Malaysian companies. Practice with
          realistic AI interviews and receive detailed feedback to improve.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Briefcase className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold text-sm">Real Questions</h3>
            <p className="text-xs text-muted-foreground">From Grab, Shopee, Google & more</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Mic className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold text-sm">Voice Interview</h3>
            <p className="text-xs text-muted-foreground">Talk naturally with AI interviewer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <BarChart3 className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold text-sm">Detailed Feedback</h3>
            <p className="text-xs text-muted-foreground">Scores, strengths & action items</p>
          </CardContent>
        </Card>
      </div>

      {/* Setup Form */}
      <Card>
        <CardHeader>
          <CardTitle>Set Up Your Interview</CardTitle>
          <CardDescription>
            Choose a company and position to practice with curated questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
            />
          </div>

          {/* Company & Position */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={company} onValueChange={handleCompanyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Top Malaysian Companies</SelectLabel>
                    {companies.filter((c) => TOP_COMPANIES.includes(c)).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Generic</SelectLabel>
                    {companies.filter((c) => GENERIC_COMPANIES.includes(c)).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              {isGeneric ? (
                <Input
                  placeholder="e.g. Marketing Executive"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              ) : (
                <Select value={position} onValueChange={setPosition} disabled={!company}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            {!isGeneric && (
              <button
                type="button"
                onClick={() => setShowJD(!showJD)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="h-4 w-4" />
                Paste Job Description (Optional)
                {showJD ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {jobDescription.trim() && (
                  <Badge variant="secondary" className="ml-1 text-xs">Added</Badge>
                )}
              </button>
            )}
            {isGeneric && (
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Job Description
              </Label>
            )}
            {showJD && (
              <div className="space-y-1.5">
                <Textarea
                  placeholder={isGeneric
                    ? "Paste the job description here — this helps tailor your interview questions to the role..."
                    : "Paste the job description here to get tailored interview questions..."
                  }
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value.slice(0, 5000))}
                  rows={6}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {jobDescription.length}/5000
                </p>
              </div>
            )}
          </div>

          {/* Question Types */}
          <div className="space-y-2">
            <Label>Question Types</Label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPE_OPTIONS.map(({ value, label }) => (
                <Badge
                  key={value}
                  variant={questionTypes.includes(value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuestionType(value)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <Label>Number of Questions</Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={n.toString()}>{n} questions</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleStart}
            disabled={isLoading || !candidateName || !company || !position}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Interview...
              </>
            ) : (
              "Start Interview"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
