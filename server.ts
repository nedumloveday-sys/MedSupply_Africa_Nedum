import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Chatbot Endpoint for Dashboard Q&A
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], dashboardContext } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "A message string is required." });
    }

    const ai = getGenAI();

    // Prepare system prompt with comprehensive context about MedSupply Africa
    const systemInstruction = `You are the MedSupply Africa Intelligence Assistant — a friendly, knowledgeable pharmaceutical inventory and supply chain specialist for a medical distributor operating across Nigeria.

You have direct access to the live dashboard state and inventory dataset ("Cleaned_Inventory", 207 total batch records across 10 state hubs).

Key Dataset Facts & Knowledge:
1. 10 State Distribution Hubs: Abuja (FCT), Benin (Edo), Enugu (Enugu), Ibadan (Oyo), Kaduna (Kaduna), Kano (Kano), Lagos (Commercial hub, highest volume), Owerri (Imo), Port Harcourt (Rivers), Sokoto (Sokoto, lowest sales volume).
2. 12 Core Drug Products: Metformin 500mg (highest overall revenue), ORS Sachets (high rehydration volume), Amoxicillin 250mg, Paracetamol 500mg, Artemether-Lumefantrine (essential antimalarial), Ibuprofen 400mg, Omeprazole 20mg, Amlodipine 5mg, Multivitamin Syrup, Ciprofloxacin 500mg, Zinc Sulfate 20mg, Co-trimoxazole 480mg.
3. 8 Categories: Analgesics, Antibiotics, Antimalarial, Cardiovascular, Diabetes, GI, Rehydration, Supplements.
4. 5 Certified Suppliers: AfriPharma, GlobalMed, MediSource, NutriLabs, PharmaCo.
5. Storage Conditions: Ambient, Cool & Dry, Refrigerated (Cold-chain required for temperature-sensitive supplies).
6. Critical Business Rules:
   - Below Reorder Point: When Stock_Remaining < Reorder_Point. These SKUs require urgent restocking.
   - Expiry Risk: Tracked in daysToExpiry. <90 days is High Urgency / Critical; 90-180 days is Moderate Warning.
   - Outlier Typo: Row MED-143 records 99,999 units sold (~₦10.9M) — flagged as a data entry typo. Cleaned metrics exclude it by default.
   - Date formats: 43 rows have ambiguous slash dates (e.g. DD/MM vs MM/DD where both <=12).

Current Dashboard Live Context:
${dashboardContext ? JSON.stringify(dashboardContext, null, 2) : "Standard full inventory of 207 records active."}

Instructions:
- Provide clear, concise, actionable answers with accurate figures in Nigerian Naira (₦) and units.
- Format responses nicely with bullet points and bold highlights where appropriate.
- When asked about reorders, highlight specific drugs, state hubs, or suppliers that have deficits.
- Maintain a helpful, professional, executive-ready tone.`;

    if (!ai) {
      // If no API key is provided, return a structured flag so frontend can use local answer engine
      return res.json({
        reply: null,
        fallback: true,
        reason: "No GEMINI_API_KEY configured on server.",
      });
    }

    // Build chat contents from history
    const contents: any[] = [];
    if (Array.isArray(history)) {
      history.slice(-6).forEach((h: { role: string; text: string }) => {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.text }],
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });
    } catch (primaryErr: any) {
      console.warn("Primary model spike, attempting gemini-flash-latest fallback:", primaryErr.message);
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });
    }

    const reply = response.text || "I was unable to generate a response for that query.";
    return res.json({ reply, fallback: false });
  } catch (error: any) {
    console.error("Gemini Chatbot Notice (falling back to local engine):", error.message);
    return res.json({
      reply: null,
      fallback: true,
      error: error.message || "Failed to process chat request",
    });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MedSupply Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
