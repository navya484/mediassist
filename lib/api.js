const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ""

/**
 * Upload an audio Blob (WebM/Opus) for transcription.
 * The backend should transcode to 16kHz WAV and run the ASR.
 */
export async function uploadAudio(blob) {
  if (!API_BASE) {
    return { message: "No API base configured. Set NEXT_PUBLIC_API_BASE_URL to enable uploads." }
  }
  const fd = new FormData()
  fd.append("file", blob, "audio.webm")

  const res = await fetch(`${API_BASE}/transcribe`, {
    method: "POST",
    body: fd,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || "Upload failed")
  }
  return res.json().catch(() => ({}))
}

async function postJSON(path, body, headers = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json().catch(() => ({}))
}

async function getJSON(path, headers = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json().catch(() => ({}))
}

// Fallback SOAP extraction (frontend-only heuristic)
function fallbackExtractSOAP(text) {
  const t = (text || "").trim()
  const sections = { S: "", O: "", A: "", P: "" }
  const parts = t.split(/\n(?=[SOAP]\s*[:-])/i)
  if (parts.length > 1) {
    parts.forEach((p) => {
      const m = p.match(/^([SOAP])\s*[:-]\s*(.*)$/is)
      if (m) sections[m[1].toUpperCase()] = m[2].trim()
    })
  } else {
    const lines = t.split("\n")
    sections.S = lines.slice(0, Math.ceil(lines.length * 0.25)).join("\n")
    sections.O = lines.filter((l) => /\d/.test(l)).join("\n")
    sections.A = lines.slice(Math.ceil(lines.length * 0.25), Math.ceil(lines.length * 0.6)).join("\n")
    sections.P = lines.slice(Math.ceil(lines.length * 0.6)).join("\n")
  }
  const toArr = (s) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
  return {
    subject: toArr(sections.S),
    objective: toArr(sections.O),
    assessment: toArr(sections.A),
    plan: toArr(sections.P),
    formatted: `S: ${sections.S}\n\nO: ${sections.O}\n\nA: ${sections.A}\n\nP: ${sections.P}`,
  }
}

const api = {
  async extractSOAP(text) {
    if (!API_BASE) return fallbackExtractSOAP(text)
    try {
      return await postJSON("/extract-soap", { text })
    } catch {
      return fallbackExtractSOAP(text)
    }
  },

  async createPrescription(payload) {
    if (!API_BASE) {
      const id = Math.random().toString(36).slice(2, 8)
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      return {
        id,
        qr_base64: "",
        share_url: origin ? `${origin}/prescription/${id}` : "",
        pdf_url: "",
      }
    }
    return postJSON("/prescriptions", payload)
  },

  async login({ email, password }) {
    if (!API_BASE) {
      return { token: "dev-token", user: { email } }
    }
    return postJSON("/auth/login", { email, password })
  },

  async register({ name, email, password }) {
    if (!API_BASE) {
      return { ok: true, user: { name, email } }
    }
    return postJSON("/auth/register", { name, email, password })
  },

  async getPrescription(id, token = "") {
    if (!API_BASE) {
      return {
        id,
        patient_name: "Jane Doe",
        patient_id: "D-001",
        doctor_name: "Dr. Smith",
        note: "Sample prescription (local fallback).",
        pdf_url: "",
      }
    }
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return getJSON(`/prescriptions/${id}`, headers)
  },
}

export { api, API_BASE }
