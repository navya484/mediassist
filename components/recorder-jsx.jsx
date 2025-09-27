"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { uploadAudio } from "@/lib/api"

export function RecorderJSX() {
  const [recording, setRecording] = useState(false)
  const [mediaSupported, setMediaSupported] = useState(false)
  const [audioURL, setAudioURL] = useState("")
  const [status, setStatus] = useState("")
  const [sizeKB, setSizeKB] = useState(0)
  const chunksRef = useRef([])
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    setMediaSupported(!!(navigator.mediaDevices && window.MediaRecorder))
  }, [])

  async function start() {
    try {
      setStatus("Requesting microphone…")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
          const total = chunksRef.current.reduce((sum, b) => sum + b.size, 0)
          setSizeKB(Math.round(total / 1024))
        }
      }
      mr.onstart = () => setStatus("Recording…")
      mr.onstop = () => setStatus("Stopped")

      mr.start(250)
      mediaRecorderRef.current = mr
      setRecording(true)
    } catch (err) {
      setStatus("Microphone permission denied or unsupported.")
      console.error(err)
    }
  }

  function stop() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    setRecording(false)

    const blob = new Blob(chunksRef.current, { type: "audio/webm" })
    setAudioURL(URL.createObjectURL(blob))
  }

  async function upload() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" })
    setStatus("Uploading audio…")
    try {
      const res = await uploadAudio(blob)
      setStatus(res?.message || "Uploaded. Backend can transcode to WAV for transcription.")
    } catch (e) {
      setStatus("Upload failed. Check NEXT_PUBLIC_API_BASE_URL or network.")
    }
  }

  return (
    <div className="space-y-4">
      {!mediaSupported ? (
        <div className="text-sm text-muted-foreground">{"MediaRecorder not supported in this browser."}</div>
      ) : (
        <div className="flex items-center gap-3">
          {!recording ? (
            <Button onClick={start}>Start Recording</Button>
          ) : (
            <Button variant="destructive" onClick={stop}>
              Stop
            </Button>
          )}
          <Button variant="secondary" onClick={upload} disabled={recording || !audioURL}>
            Upload for Transcription
          </Button>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        {"Format: WebM/Opus (frontend). Backend should transcode to 16kHz WAV."}
      </div>

      <div className="grid gap-2">
        <div className="text-sm">
          {"Buffered size: "}
          {sizeKB}
          {" KB"}
        </div>
        <Progress value={Math.min(100, (sizeKB / 5120) * 100)} />
      </div>

      {audioURL ? (
        <audio src={audioURL} controls className="w-full" />
      ) : (
        <div className="text-sm text-muted-foreground">{"No recording yet."}</div>
      )}

      {status ? <div className="text-sm">{status}</div> : null}
    </div>
  )
}
