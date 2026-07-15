import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, localTime } = await req.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server' }, { status: 500 });
    }

    const systemInstruction = `
You are an expert football data parser. Extract the following information from the user's input and return ONLY a valid JSON object. Do not include markdown formatting, backticks, or any conversational text. Just raw JSON.
The user's local time currently is: ${localTime}. Use this as a reference point to calculate exact datetimes if the user says "tomorrow at 9pm" etc. 

JSON format:
{
  "home_team": "String (e.g. Spain)",
  "away_team": "String (e.g. France)",
  "league": "String (Pick one: World Cup, UEFA Champions League, Euro Championship, Copa America, Premier League, La Liga, UEFA Nations League, Europa League, Major League Soccer, Custom Friendly)",
  "kickoff": "ISO 8601 string of the kickoff time. Convert their relative time into an exact timestamp based on their local time.",
  "is_knockout": true/false (true if semi final, final, quarter, knockout etc.)
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(errorData.error?.message || "Failed to call Gemini API");
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      throw new Error("Empty response from AI");
    }

    const parsedJson = JSON.parse(textResponse);
    return NextResponse.json(parsedJson);

  } catch (error: any) {
    console.error("Parse match error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
