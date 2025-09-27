"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"

export default function PrescriptionViewPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const token = search.get("token") || localStorage.getItem("mediassist_jwt") || ""
        const resp = await api.getPrescription(params.id, token)
        setData(resp)
      } catch (e: any) {
        setError(e?.message || "Failed to load prescription.")
      }
    }
    run()
  }, [params.id, search])

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="text-destructive">{error}</div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div>Loading...</div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Prescription #{params.id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            Patient: {data?.patient_name} ({data?.patient_id})
          </div>
          <div className="text-sm">Doctor: {data?.doctor_name}</div>
          <div className="text-sm whitespace-pre-wrap">{data?.note}</div>
          {data?.pdf_url ? (
            <a className="underline text-sm" href={data.pdf_url} target="_blank" rel="noreferrer">
              Open PDF
            </a>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
