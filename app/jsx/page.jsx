import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RecorderJSX } from "@/components/recorder-jsx"
import { SOAPViewJSX } from "@/components/soap-view-jsx"
import { PrescriptionCardJSX } from "@/components/prescription-card-jsx"

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-balance">MediAssist AI (JSX)</h1>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="outline">Login</Button>
          </Link>
          <Link href="/register">
            <Button>Register</Button>
          </Link>
        </div>
      </header>

      <Separator />

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Real-time Transcription</CardTitle>
            <CardDescription>Capture audio in the browser; optionally upload for transcription.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-muted-foreground">{"Loading recorder…"}</div>}>
              <RecorderJSX />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SOAP Note</CardTitle>
            <CardDescription>Quickly outline Subjective, Objective, Assessment, Plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <SOAPViewJSX />
          </CardContent>
        </Card>
      </section>

      <PrescriptionCardJSX />

      <section className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {"This JSX-only page is a minimal frontend basis (no TypeScript)."}
        </div>
        <Link href="/">
          <Button variant="secondary">Go to TS version</Button>
        </Link>
      </section>
    </main>
  )
}
