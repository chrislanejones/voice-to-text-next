import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio = formData.get("audio") as Blob

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const form = new FormData()
    form.append("audio", audio, "audio.wav")
    form.append("model", "openai/whisper-large-v3")

    const response = await fetch("https://api-inference.huggingface.co/models/openai/whisper-large-v3", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      },
      body: form,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Hugging Face API error:", errorText)
      return NextResponse.json({ error: `Hugging Face API request failed: ${errorText}` }, { status: response.status })
    }

    const result = await response.json()

    if (!result.text) {
      return NextResponse.json({ error: "No transcription text returned from the API" }, { status: 500 })
    }

    return NextResponse.json({ text: result.text })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed" },
      { status: 500 },
    )
  }
}

