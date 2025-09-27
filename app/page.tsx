import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Recorder } from "@/components/recorder"
import { SOAPView } from "@/components/soap-view"
import { PrescriptionCard } from "@/components/prescription-card"

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-balance">MediAssist AI</h1>
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
            <CardDescription>Capture doctor-patient audio and stream transcription via Whisper.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-muted-foreground">Loading recorder…</div>}>
              <Recorder />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SOAP Note</CardTitle>
            <CardDescription>Extract structured S/O/A/P from transcript.</CardDescription>
          </CardHeader>
          <CardContent>
            <SOAPView />
          </CardContent>
        </Card>
      </section>

      <PrescriptionCard />

      <section className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Offline-first: Notes and prescriptions are cached locally and auto-synced when reconnected.
        </div>
        <Link href="/records/demo-patient-id">
          <Button variant="secondary">View Patient Records</Button>
        </Link>
      </section>
    </main>
  )
}
