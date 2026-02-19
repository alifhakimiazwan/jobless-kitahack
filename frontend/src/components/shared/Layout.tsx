import { Outlet, Link } from "react-router-dom"
import { Briefcase } from "lucide-react"

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Briefcase className="h-5 w-5 text-primary" />
            <span>JobLess</span>
          </Link>
          <span className="ml-2 text-xs text-muted-foreground">AI Interview Coach</span>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
