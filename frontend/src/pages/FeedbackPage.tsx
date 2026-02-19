import { useEffect, useState, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getFeedback, getInterviewStatus, triggerEvaluation } from "@/services/api"
import type { FeedbackReport, QuestionEvaluation, InterviewStatus } from "@/types/interview.types"
import {
  ArrowLeft,
  Award,
  TrendingUp,
  Target,
  Lightbulb,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color =
    score >= 8 ? "text-green-600" :
    score >= 6 ? "text-yellow-600" :
    score >= 4 ? "text-orange-600" :
    "text-red-600"

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-2xl font-bold ${color}`}>{score.toFixed(1)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function GradeBadge({ grade }: { grade: string }) {
  const variant = grade.startsWith("A") ? "default" :
    grade.startsWith("B") ? "secondary" :
    "destructive"
  return <Badge variant={variant} className="text-lg px-3 py-1">{grade}</Badge>
}

function QuestionFeedbackCard({ evaluation }: { evaluation: QuestionEvaluation }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{evaluation.question_text}</CardTitle>
        <CardDescription>{evaluation.answer_summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scores */}
        <div className="grid grid-cols-4 gap-4">
          <ScoreCircle score={evaluation.relevance.score} label="Relevance" />
          <ScoreCircle score={evaluation.depth.score} label="Depth" />
          <ScoreCircle score={evaluation.structure.score} label="Structure" />
          <ScoreCircle score={evaluation.communication.score} label="Communication" />
        </div>

        {/* Overall */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Overall:</span>
          <Progress value={evaluation.overall_score * 10} className="flex-1" />
          <span className="text-sm font-medium">{evaluation.overall_score.toFixed(1)}/10</span>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Strengths
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {evaluation.strengths.map((s, i) => (
                <li key={i}>- {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
              <AlertCircle className="h-3 w-3 text-orange-600" />
              To Improve
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {evaluation.improvements.map((s, i) => (
                <li key={i}>- {s}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function FeedbackPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null)
  const [status, setStatus] = useState<InterviewStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [evaluationTriggered, setEvaluationTriggered] = useState(false)

  const pollForFeedback = useCallback(async () => {
    if (!sessionId) return

    try {
      const statusRes = await getInterviewStatus(sessionId)
      setStatus(statusRes.status)

      if (statusRes.status === "evaluated") {
        const feedbackData = await getFeedback(sessionId)
        setFeedback(feedbackData)
        setIsLoading(false)
      } else if (statusRes.status === "completed" && !evaluationTriggered) {
        // Trigger evaluation
        await triggerEvaluation(sessionId)
        setEvaluationTriggered(true)
      } else if (statusRes.status === "evaluating") {
        // Continue polling
        setTimeout(pollForFeedback, 3000)
      } else {
        setIsLoading(false)
      }
    } catch (err) {
      // Check if feedback is already available
      try {
        const feedbackData = await getFeedback(sessionId)
        setFeedback(feedbackData)
        setIsLoading(false)
      } catch {
        setError(err instanceof Error ? err.message : "Failed to load feedback")
        setIsLoading(false)
      }
    }
  }, [sessionId, evaluationTriggered])

  useEffect(() => {
    pollForFeedback()
  }, [pollForFeedback])

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold mb-2">
          {status === "evaluating" ? "Evaluating Your Interview..." : "Loading Feedback..."}
        </h2>
        <p className="text-muted-foreground">
          {status === "evaluating"
            ? "Our AI is analyzing your answers. This takes about 30 seconds."
            : "Preparing your feedback report..."}
        </p>
      </div>
    )
  }

  if (error || !feedback) {
    return (
      <div className="container max-w-3xl py-20 text-center">
        <AlertCircle className="h-10 w-10 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Feedback</h2>
        <p className="text-muted-foreground mb-4">{error || "Feedback not available"}</p>
        <Link to="/">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            New Interview
          </Button>
        </Link>
        <GradeBadge grade={feedback.overall_grade} />
      </div>

      {/* Overview Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Interview Feedback</CardTitle>
              <CardDescription>
                {feedback.candidate_name} - {feedback.position} at {feedback.company}
              </CardDescription>
            </div>
            <ScoreCircle score={feedback.overall_score} label="Overall" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{feedback.summary}</p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Per Question</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  Top Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.top_strengths.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  Key Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.key_improvements.map((s, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Target className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Encouragement */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm">{feedback.encouragement}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per Question Tab */}
        <TabsContent value="questions" className="space-y-4">
          {feedback.per_question_feedback.map((evaluation, i) => (
            <QuestionFeedbackCard key={i} evaluation={evaluation} />
          ))}
        </TabsContent>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="space-y-4">
          {feedback.action_items.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{i + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{item.area}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.suggestion}</p>
                    {item.example && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded">
                        Example: {item.example}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="text-center pt-4">
            <Link to="/">
              <Button size="lg">Practice Again</Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
