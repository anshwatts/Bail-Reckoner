import { extractedCaseSchema } from './schemas.js';

export function buildExtractionPrompt(documentText) {
  const systemPrompt = `You are an expert legal data extraction assistant.
Extract structured case details from Indian criminal law documents (such as FIRs, remand sheets, and bail applications).
You must output ONLY a valid JSON object matching the following schema without any markdown commentary:
{
  "accusedName": string or null,
  "firNumber": string or null,
  "policeStation": string or null,
  "district": string or null,
  "arrestDate": string in ISO/YYYY-MM-DD format or null,
  "remandDate": string in ISO/YYYY-MM-DD format or null,
  "chargesheetDate": string in ISO/YYYY-MM-DD format or null,
  "rawSections": array of strings (e.g. ["303(2) BNS", "Section 379 IPC"]),
  "confidence": number between 0 and 1,
  "missingFields": array of strings
}

CRITICAL RULES:
1. Do NOT guess or hallucinate any fields. If a field is not explicitly and clearly stated in the document, you MUST return null for that field.
2. If mandatory fields like arrestDate, remandDate, or offenses/sections cannot be found with certainty, return null and add their names to "missingFields".
3. Return rawSections as an array of mentioned offense sections along with the act if mentioned.
4. Output raw JSON only.`;

  const userPrompt = `Extract the legal case details from the following document text:

--- BEGIN DOCUMENT ---
${documentText || ''}
--- END DOCUMENT ---`;

  return {
    systemPrompt,
    userPrompt,
    system: systemPrompt,
    user: userPrompt
  };
}

export function parseExtractionResponse(rawResponse) {
  if (!rawResponse) {
    throw new Error('Empty response received from extraction model');
  }

  let text = typeof rawResponse === 'string' ? rawResponse.trim() : JSON.stringify(rawResponse);

  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1].trim();
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse extraction response as JSON: ${err.message}`);
  }

  const validated = extractedCaseSchema.parse(parsedJson);

  const missing = new Set(validated.missingFields || []);
  if (!validated.arrestDate) {
    missing.add('arrestDate');
  }
  if (!validated.remandDate) {
    missing.add('remandDate');
  }
  if (!validated.rawSections || validated.rawSections.length === 0) {
    missing.add('rawSections');
  }

  return {
    ...validated,
    missingFields: Array.from(missing)
  };
}
