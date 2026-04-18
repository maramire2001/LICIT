export function createAnalisisSocket(
  analisisId: string,
  onProgress: (step: string, progress: number) => void,
  onComplete: () => void
): WebSocket {
  const wsBase =
    (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(
      /^http/,
      "ws"
    )
  const ws = new WebSocket(`${wsBase}/ws/analisis/${analisisId}`)

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    onProgress(data.step, data.progress)
    if (data.progress === 100) {
      onComplete()
      ws.close()
    }
  }

  return ws
}
