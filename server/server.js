// server/server.js (versión limpia con Assistants API v2)
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ASSISTANT_ID = "asst_lnV0PpTCJxVdmnRI0dAgkJm0"; // ID de LeeuwenBot

const openaiHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  'OpenAI-Beta': 'assistants=v2'
};

app.use(bodyParser.json());
app.use(express.static('public_html'));
app.use('/images', express.static('images'));

app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const threadRes = await fetch("https://api.openai.com/v1/threads", {
      method: 'POST',
      headers: openaiHeaders
    });
    const thread = await threadRes.json();

    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: openaiHeaders,
      body: JSON.stringify({
        role: "user",
        content: userMessage
      })
    });

    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: openaiHeaders,
      body: JSON.stringify({ assistant_id: ASSISTANT_ID })
    });
    const run = await runRes.json();

    let runStatus = "queued";
    while (runStatus === "queued" || runStatus === "in_progress") {
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: openaiHeaders
      });
      const statusData = await statusRes.json();
      runStatus = statusData.status;
      if (runStatus === "completed") break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: openaiHeaders
    });
    const messagesData = await messagesRes.json();

    const assistantMessage = messagesData.data?.find(m => m.role === 'assistant');
    let reply = "Lo siento, sin respuesta.";

    if (assistantMessage && Array.isArray(assistantMessage.content)) {
      const textPart = assistantMessage.content.find(part => part.type === 'text');
     if (textPart?.text?.value) {
  // Elimina citas tipo   usando una expresión regular
  reply = textPart.text.value.replace(/【\d+:\d+†source】/g, '');
}
    }

    res.json({ reply });

  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la solicitud del asistente' });
  }
});

app.listen(PORT, () => console.log(`🧠 LeeuwenBot activo en http://localhost:${PORT}`));
