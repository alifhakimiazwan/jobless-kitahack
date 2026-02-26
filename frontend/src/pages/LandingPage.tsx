import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Mic, ArrowRight } from "lucide-react"

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="container max-w-4xl py-16">
      {/* Hero */}
      <div className="text-center mb-14">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          JobBless
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your AI-powered interview coach. Analyze your resume, then practice
          with a realistic voice interview — all tailored to top Malaysian companies.
        </p>
      </div>

      {/* Two feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resume Checker */}
        <Card
          className="group cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/50"
          onClick={() => navigate("/resume")}
        >
          <CardHeader className="pb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Check My Resume</CardTitle>
            <CardDescription>
              Upload your PDF resume to get instant AI feedback and a list of
              tailored interview questions based on your background.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-5">
              <li>Overall grade &amp; market readiness</li>
              <li>Section-by-section feedback</li>
              <li>Resume-tailored interview questions</li>
              <li>Proceed directly to a practice interview</li>
            </ul>
            <Button className="w-full group-hover:bg-primary/90" onClick={() => navigate("/resume")}>
              Analyze Resume
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* AI Interview Practice */}
        <Card
          className="group cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/50"
          onClick={() => navigate("/setup")}
        >
          <CardHeader className="pb-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center mb-3">
              <Mic className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">AI Interview Practice</CardTitle>
            <CardDescription>
              Jump straight into a voice interview with an AI interviewer using
              curated questions from Grab, Shopee, Google, and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-5">
              <li>150+ real interview questions</li>
              <li>Voice or text mode</li>
              <li>Paste a job description for custom questions</li>
              <li>Detailed scoring &amp; feedback report</li>
            </ul>
            <Button className="w-full group-hover:bg-primary/90" onClick={() => navigate("/setup")}>
              Start Interview
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
