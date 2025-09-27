import io
import qrcode
import base64
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from .auth import create_access_token

def generate_prescription_pdf_and_qr(patient_name: str, patient_id: str, doctor_name: str, note: str, jwt_secret: str):
  # Create share token and URL (front-end should set PUBLIC_WEB_BASE_URL)
  token = create_access_token({ "patient_id": patient_id, "doctor_name": doctor_name })
  # The actual share URL will be formed in the route using the generated prescription_id
  # For QR generation, embed a placeholder; frontend/server will return proper one after insert
  placeholder_url = "about:blank"

  # QR PNG base64
  qr = qrcode.QRCode(version=1, box_size=8, border=2)
  qr.add_data(placeholder_url)
  qr.make(fit=True)
  img = qr.make_image(fill_color="black", back_color="white")
  buf = io.BytesIO()
  img.save(buf, format="PNG")
  qr_png_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

  # PDF
  pdf_buf = io.BytesIO()
  c = canvas.Canvas(pdf_buf, pagesize=letter)
  width, height = letter
  y = height - 72
  c.setFont("Helvetica-Bold", 16)
  c.drawString(72, y, "Prescription")
  y -= 28
  c.setFont("Helvetica", 11)
  c.drawString(72, y, f"Doctor: {doctor_name}")
  y -= 18
  c.drawString(72, y, f"Patient: {patient_name} (ID: {patient_id})")
  y -= 24
  text = c.beginText(72, y)
  text.setFont("Helvetica", 10)
  for line in note.splitlines():
    text.textLine(line)
  c.drawText(text)
  c.showPage()
  c.save()
  pdf_bytes = pdf_buf.getvalue()

  return pdf_bytes, qr_png_b64
