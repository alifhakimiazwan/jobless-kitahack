import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "@/components/shared/Layout"
import LandingPage from "@/pages/LandingPage"
import SetupPage from "@/pages/HomePage"
import InterviewPage from "@/pages/InterviewPage"
import FeedbackPage from "@/pages/FeedbackPage"
import ResumePage from "@/pages/ResumePage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/interview/:sessionId" element={<InterviewPage />} />
          <Route path="/feedback/:sessionId" element={<FeedbackPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/resume/:sessionId" element={<ResumePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
