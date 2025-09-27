"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export function Recorder() {
  const { toast } = useToast()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown")

  useEffect(() => {
    // Clean up WS on unmount
    return () => {
      wsRef.current?.close()
      mediaRecorderRef.current?.stop()
    }
  }, [])

  const openWS = useCallback(() => {
    if (!API_BASE) return null
    const wsUrl = API_BASE.replace(/^http/, "ws") + "/ws/transcribe"
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => {
      // console.log("[v0] WS connected")
    }
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        if (data.type === "partial" || data.type === "final") {
          setTranscript((prev) => (prev ? prev + " " : "") + data.text)
          // Save to localStorage for offline continuity
          localStorage.setItem(
            "mediassist_current_transcript",
            (localStorage.getItem("mediassist_current_transcript") || "") + " " + data.text,
          )
          window.dispatchEvent(new CustomEvent("mediassist:transcript", { detail: { text: data.text } }))
        }
      } catch {
        // ignore
      }
    }
    ws.onerror = () => {
      toast({
        title: "Transcription stream error",
        description: "Falling back to local recording only.",
        variant: "destructive",
      })
    }
    ws.onclose = () => {
      // console.log("[v0] WS closed")
    }
    wsRef.current = ws
    return ws
  }, [toast])

  const requestPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setPermission("granted")
    } catch {
      setPermission("denied")
      toast({
        title: "Microphone blocked",
        description: "Please allow microphone access to record.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  const startRecording = useCallback(async () => {
    if (permission !== "granted") {
      await requestPermission()
      if (permission !== "granted") return
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
    mediaRecorderRef.current = mediaRecorder

    if (API_BASE) {
      openWS()
    }

    mediaRecorder.ondataavailable = async (e) => {
      if (e.data && e.data.size > 0) {
        // Send audio chunk to websocket if available, else keep local
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const arrayBuffer = await e.data.arrayBuffer()
          wsRef.current.send(arrayBuffer)
        } else {
          // Store locally; can sync later for batch transcription if needed
          const chunksKey = "mediassist_audio_chunks"
          const prev = JSON.parse(localStorage.getItem(chunksKey) || "[]")
          localStorage.setItem(chunksKey, JSON.stringify([...prev, await blobToBase64(e.data)]))
        }
      }
    }

    mediaRecorder.start(500) // small chunks
    setRecording(true)
  }, [openWS, permission, requestPermission])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    wsRef.current?.send(JSON.stringify({ type: "done" }))
    wsRef.current?.close()
    setRecording(false)
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript("")
    localStorage.removeItem("mediassist_current_transcript")
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {!recording ? (
          <Button onClick={startRecording}>Start Recording</Button>
        ) : (
          <Button variant="destructive" onClick={stopRecording}>
            Stop
          </Button>
        )}
        <Button variant="outline" onClick={clearTranscript}>
          Clear
        </Button>
      </div>
      <Textarea
        className="min-h-[180px]"
        value={
          transcript ||
          (typeof window !== "undefined" ? localStorage.getItem("mediassist_current_transcript") || "" : "")
        }
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Live transcription will appear here..."
      />
    </div>
  )
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string) || "")
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
