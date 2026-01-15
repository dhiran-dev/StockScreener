
import { GoogleGenAI } from "@google/genai";
import { StockAnalysis } from "../types";

export const getTradeRationale = async (analysis: StockAnalysis): Promise<string> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
    return "AI insights are currently disabled because no API key was found in the environment. The scanner and charts remain fully functional.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Act as a professional NSE stock analyst. 
        Analyze the following technical data for ${analysis.symbol}:
        - Current Price: ₹${analysis.price.toFixed(2)}
        - Setup Score: ${analysis.score}/100
        - Order Blocks: ${analysis.orderBlocks.filter(o => !o.isMitigated).length} active zones.
        - VCP Pattern: ${analysis.vcp.isVCP ? 'Confirmed' : 'No clear contraction'}.
        - Contraction Ratio: ${analysis.vcp.contractionRatio.toFixed(2)}.

        Provide a concise (2-3 sentence) trade rationale explaining why this is or isn't an "A+" setup according to Smart Money Concepts (OB) and VCP principles.
      `,
    });
    
    return response.text || "Unable to generate rationale at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    if (error instanceof Error && error.message.includes("API_KEY_INVALID")) {
      return "The provided Gemini API key is invalid. Please check your environment configuration.";
    }
    return "AI analysis is currently unavailable (technical error).";
  }
};
