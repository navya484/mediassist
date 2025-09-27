"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

type SOAP = {
  subject: string[]
  objective: string[]
  assessment: string[]
  plan: string[]
  formatted: string
}

export function SOAPView() {
  const { toast } = useToast()
  const [input, setInput] = useState("")
  const [soap, setSoap] = useState<SOAP | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const initial = localStorage.getItem("mediassist_current_transcript") || ""
    setInput(initial.trim())
  }, [])

  const handleExtract = useCallback(async () => {
    if (!input.trim()) {
      toast({
        title: "No transcript",
        description: "Please provide some text to extract SOAP.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    try {
      const data = await api.extractSOAP(input)
      setSoap(data)
      localStorage.setItem("mediassist_last_soap", JSON.stringify(data))
      window.dispatchEvent(new CustomEvent("mediassist:soap", { detail: data }))
    } catch (e: any) {
      toast({ title: "Extraction failed", description: e?.message || "Try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [input, toast])

  const formatted = useMemo(() => {
    return soap?.formatted || ""
  }, [soap])

  return (
    <div className="space-y-3">
      <Textarea
        className="min-h-[120px]"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste or refine transcript text for SOAP extraction..."
      />
      <div className="flex items-center gap-3">
        <Button onClick={handleExtract} disabled={loading}>
          {loading ? "Extracting..." : "Extract SOAP"}
        </Button>
      </div>
      {soap && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <pre className="text-xs overflow-auto rounded bg-muted p-3">{JSON.stringify(soap, null, 2)}</pre>
            <div className="text-sm leading-6 whitespace-pre-wrap">{formatted}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
