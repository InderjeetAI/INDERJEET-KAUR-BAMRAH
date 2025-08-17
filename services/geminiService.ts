
import { GoogleGenAI, Type } from "@google/genai";
import type { SensitiveInfo } from '../types';

// This function assumes `process.env.API_KEY` is set in the environment.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SENSITIVE_INFO_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: "The classification of the sensitive data. Use labels like 'PERSON', 'ORG', 'ADDRESS', 'Email', 'GSTIN', 'PAN', etc.",
      },
      text: {
        type: Type.STRING,
        description: "The exact text of the sensitive data found in the document.",
      },
    },
    required: ["type", "text"],
  },
};

export const analyzeTextForSensitiveInfo = async (text: string): Promise<SensitiveInfo[]> => {
  if (!text.trim()) {
    console.warn("analyzeTextForSensitiveInfo called with empty text.");
    return [];
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Your mission is to act as a highly precise data extraction tool. You must meticulously scan the provided document text and identify and extract all instances of the following sensitive information categories. Accuracy and completeness are paramount for all categories.

**Sensitive Information Categories to Extract:**

1.  **Names & Organizations:**
    *   **PERSON:** All names of individuals. This is a top priority. Include full names, names with titles, signatories, proprietors, directors, officers, and any person mentioned (e.g., 'PREET SHARMA', 'Rahul Sharma', 'Smt. Anjali Gupta', 'Director: Mr. S. Kumar').
    *   **ORG (Organization):** All names of companies, institutions, agencies, and trade names. Be thorough (e.g., 'Sharma Traders', 'Infosys Limited', 'ABC Tech Pvt. Ltd.').

2.  **Locations:**
    *   **ADDRESS:** Full street addresses. Extract the complete address, including building names, street names, sector numbers, and landmarks (e.g., '123 Connaught Place, Sector 18, New Delhi – 110001', 'Shop No. 5, Main Market, Gurgaon').
    *   **GPE (Geopolitical Entity):** Names of countries, cities, states (e.g., 'New Delhi', 'Haryana', 'India').
    *   **LOC (Location):** Other non-GPE locations, like specific places or facilities if not part of a full address.

3.  **Contact Information:**
    *   Email addresses.
    *   Phone numbers.

4.  **Government & Financial IDs:**
    *   GSTIN (e.g., '07ABCDE1234F1Z5').
    *   PAN (e.g., 'CELPB6777G').
    *   Aadhaar number (e.g., '2345 6789 1234').
    *   TAN (e.g., 'DELA12345B').
    *   DIN (Document Identification Number).
    *   ARN (Application Reference Number).
    *   Bank Account Numbers.
    *   IFSC Codes.

5.  **Document-Specific Identifiers:**
    *   Case numbers, Notice numbers, Reference IDs.

**Crucial Instructions:**

*   **Extract Values, Not Labels:** If you find "Company Name: ABC Tech Pvt. Ltd.", you must extract "ABC Tech Pvt. Ltd.", not the label "Company Name:".
*   **Exact Extraction:** Extract the sensitive information *exactly* as it appears in the text. Do not summarize, alter, or abbreviate it.
*   **Be Exhaustive:** Scan the entire document for all possible matches across all categories. Do not stop after finding just a few. Every piece of sensitive data is important.

Here is the document text:

---

${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: SENSITIVE_INFO_SCHEMA,
        temperature: 0, // Use 0 temperature for maximum precision in extraction tasks
      },
    });

    const jsonString = response.text.trim();
    if (!jsonString) {
      return [];
    }

    const parsedData = JSON.parse(jsonString);
    
    // Validate that the parsed data is an array before returning
    if (Array.isArray(parsedData)) {
      // Rename types for better UI grouping
      return (parsedData as SensitiveInfo[]).map(item => {
        if (item.type === 'PERSON') {
          return { ...item, type: 'Name' };
        }
        if (item.type === 'GPE' || item.type === 'LOC') {
          return { ...item, type: 'Location' };
        }
        return item;
      });
    } else {
      console.warn("Gemini API returned non-array data:", parsedData);
      return [];
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze text with AI. Please check the browser console for more details.");
  }
};
