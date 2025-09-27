"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function PrescriptionCardJSX() {
  const [form, setForm] = useState({
    patient: "",
    diagnosis: "",
    medication: "",
    dosage: "",
    instructions: "",
  })

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function preview() {
    alert(
      [
        "Prescription Preview",
        `Patient: ${form.patient}`,
        `Diagnosis: ${form.diagnosis}`,
        `Medication: ${form.medication}`,
        `Dosage: ${form.dosage}`,
        `Instructions: ${form.instructions}`,
      ].join("\n"),
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prescription (JSX)</CardTitle>
        <CardDescription>{"Minimal frontend form only; wire to your backend when ready."}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm">Patient</label>
          <Input value={form.patient} onChange={(e) => setField("patient", e.target.value)} placeholder="Jane Doe" />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Diagnosis</label>
          <Input
            value={form.diagnosis}
            onChange={(e) => setField("diagnosis", e.target.value)}
            placeholder="Hypertension"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Medication</label>
          <Input
            value={form.medication}
            onChange={(e) => setField("medication", e.target.value)}
            placeholder="Lisinopril"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Dosage</label>
          <Input value={form.dosage} onChange={(e) => setField("dosage", e.target.value)} placeholder="10 mg daily" />
        </div>
        <div className="grid gap-1">
          <label className="text-sm">Instructions</label>
          <Textarea
            value={form.instructions}
            onChange={(e) => setField("instructions", e.target.value)}
            placeholder="Take once daily in the morning."
          />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={preview}>Generate Preview</Button>
      </CardFooter>
    </Card>
  )
}
