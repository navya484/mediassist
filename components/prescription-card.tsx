"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

type PrescriptionResponse = {
  id: string
  qr_base64?: string
  share_url?: string
  pdf_url?: string
}

export function PrescriptionCard() {
  const { toast } = useToast()
  const [patientName, setPatientName] = useState("")
  const [patientId, setPatientId] = useState("")
  const [notes, setNotes] = useState("")
  const [result, setResult] = useState<PrescriptionResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const lastSOAP = localStorage.getItem("mediassist_last_soap")
    if (lastSOAP) {
      setNotes(JSON.parse(lastSOAP)?.formatted || "")
    }
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!patientName || !patientId || !notes) {
      toast({
        title: "Missing fields",
        description: "Patient name, ID and notes are required.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    try {
      const res = await api.createPrescription({
        patient_name: patientName,
        patient_id: patientId,
        note: notes,
      })
      setResult(res)
      // offline cache
      localStorage.setItem("mediassist_last_prescription", JSON.stringify(res))
    } catch (e: any) {
      toast({
        title: "Failed to generate prescription",
        description: e?.message || "Try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [patientId, patientName, notes, toast])

  const qrDataUrl = useMemo(() => result?.qr_base64 || "", [result])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prescription</CardTitle>
        <CardDescription>Generate PDF and share via QR. The web view is JWT-protected.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        </div>
        <Textarea
          className="min-h-[120px]"
          placeholder="Diagnosis, medications, dosages, instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Prescription"}
          </Button>
          {result?.pdf_url ? (
            <a href={result.pdf_url} target="_blank" rel="noreferrer" className="text-sm underline">
              Open PDF
            </a>
          ) : null}
          {result?.share_url ? (
            <a href={result.share_url} target="_blank" rel="noreferrer" className="text-sm underline">
              Open Web View
            </a>
          ) : null}
        </div>
        {qrDataUrl ? (
          <div className="pt-2">
            <img src={qrDataUrl || "/placeholder.svg"} alt="Prescription QR" className="h-32 w-32" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
