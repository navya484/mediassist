import React, { useState } from 'react';
import QRCode from 'qrcode.react';

function App() {
  const [recording, setRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [qrUrl, setQrUrl] = useState(null);
  const [error, setError] = useState(null);
  const [recognition, setRecognition] = useState(null);

  const startRecording = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech Recognition API not supported in this browser');
        return;
      }

      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTranscription(transcript);
      };

      rec.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
      };

      rec.onend = () => {
        setRecording(false);
      };

      rec.start();
      setRecognition(rec);
      setRecording(true);
    } catch (err) {
      setError('Failed to start speech recognition');
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
    }
  };

  const submitTranscription = async () => {
    if (!transcription) {
      setError('No transcription available');
      return;
    }

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription }),
      });
      const data = await response.json();
      if (data.url) {
        setQrUrl(data.url);
      } else {
        setError('Failed to process transcription');
      }
    } catch (err) {
      setError('Error submitting transcription');
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>MediAssist AI</h1>
      {!recording ? (
        <button onClick={startRecording}>Start Recording</button>
      ) : (
        <button onClick={stopRecording}>Stop Recording</button>
      )}
      {transcription && !qrUrl && (
        <div>
          <p><strong>Transcription:</strong> {transcription}</p>
          <button onClick={submitTranscription}>Submit Transcription</button>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {qrUrl && (
        <div>
          <h2>Scan QR for Prescription</h2>
          <QRCode value={qrUrl} />
          <p><a href={qrUrl}>{qrUrl}</a></p>
        </div>
      )}
    </div>
  );
}

export default App;