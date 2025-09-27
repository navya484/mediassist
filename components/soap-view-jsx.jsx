"use client"

import { useMemo, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function extractSOAP(text) {
  const t = (text || "").trim()

  // Naive keyword-based split as a placeholder for NLP.
  const sections = { S: "", O: "", A: "", P: "" }
  const parts = t.split(/\n(?=[SOAP]\s*[:-])/i)
  if (parts.length > 1) {
    parts.forEach((p) => {
      const m = p.match(/^([SOAP])\s*[:-]\s*(.*)$/is)
      if (m) sections[m[1].toUpperCase()] = m[2].trim()
    })
  } else {
    // Fallback heuristic: first paragraph subjective, numbers/objective, rest split.
    const lines = t.split("\n")
    sections.S = lines.slice(0, Math.ceil(lines.length * 0.25)).join("\n")
    sections.O = lines.filter((l) => /\d/.test(l)).join("\n")
    sections.A = lines.slice(Math.ceil(lines.length * 0.25), Math.ceil(lines.length * 0.6)).join("\n")
    sections.P = lines.slice(Math.ceil(lines.length * 0.6)).join("\n")
  }
  return sections
}

export function SOAPViewJSX() {
  const [input, setInput] = useState("")
  const soap = useMemo(() => extractSOAP(input), [input])

  return (
    <div className="space-y-4">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={"Paste transcript here. Optionally prefix lines with S:, O:, A:, P:"}
        className="min-h-40"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subjective</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{soap.S || "—"}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Objective</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{soap.O || "—"}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{soap.A || "—"}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{soap.P || "—"}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
