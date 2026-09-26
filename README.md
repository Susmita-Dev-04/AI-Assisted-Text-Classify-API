# AI-Assisted Text Classification API

A backend REST API that classifies free-form input text into one of four categories - **Complaint**, **Query**, **Feedback**, or **Other** - using an AI model (Groq), with a custom fallback confidence engine for reliability.


📄 **[Read the full Solution Explanation PDF](./INT_Global_AI_Text_Classification_Solution.pdf)** : covers architecture diagrams, flowcharts, and design decisions in detail.

Built as part of the Backend Assignment (Assignment 1) for Indus Net Technologies Ltd.


---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup Instructions](#setup-instructions)
5. [Environment Variables](#environment-variables)
6. [API Documentation](#api-documentation)
7. [How AI Was Used](#how-ai-was-used)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Development Journey — What I Built, Step by Step](#development-journey--what-i-built-step-by-step)
11. [Challenges Faced & How I Solved Them](#challenges-faced--how-i-solved-them)
12. [Possible Future Improvements](#possible-future-improvements)

---

## Overview

**Problem statement:** Build a backend service that classifies input text into categories like Complaint, Query, Feedback, or Other using an AI model.

**Solution:** A clean, modular Express.js REST API with a single `POST /api/classify` endpoint. It sends the input text to Groq's hosted AI model with a tightly-constrained prompt, parses the structured JSON response, and returns a category with a confidence score. If the AI ever fails, times out, or returns something unusable, a self-written keyword-based fallback classifier kicks in automatically — so the API never crashes and always returns a sensible result.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js | Required option from assignment brief |
| Framework | Express.js | Lightweight, widely used, easy to structure cleanly |
| AI Provider | Groq API (`openai/gpt-oss-20b`) | Free tier, no credit card required, OpenAI-compatible endpoint, fast inference |
| HTTP Client | Axios | Simple promise-based requests with timeout support |
| Config | dotenv | Keeps API keys out of source code |
| Dev tooling | Nodemon | Auto-restarts server on file changes during development |

---

## Project Structure

```
AI-Assisted-Text-Classification/
├── src/
│   ├── controllers/
│   │   └── classify.controller.js   # Request validation, response shaping, error routing
│   ├── services/
│   │   └── classify.service.js      # AI call, prompt, response parsing, fallback logic
│   ├── routes/
│   │   └── classify.routes.js       # Route definitions
│   ├── app.js                       # Express app: middleware, route mounting, error handlers
│   └── server.js                    # Entry point: loads env, starts server
├── .env                             # Real secrets (NOT committed)
├── .env.example                     # Template showing required variables
├── .gitignore
├── package.json
├── postman_collection.json          # Ready-to-import Postman test suite
└── README.md
```

**Design rationale:** Routes, controllers, and services are kept in separate files (rather than one big `index.js`) so each layer has one responsibility — routes just map URLs, the controller only validates and shapes HTTP responses, and the service holds all the actual AI/business logic. This makes the code easy to test, extend, or swap the AI provider without touching unrelated files.

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Susmita-Dev-04/AI-Assisted-Text-Classify-API
cd ai-assisted-text-classification
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file:

```bash
cp .env.example .env
```

Then open `.env` and add your own Groq API key:

```
PORT=5000
AI_API_KEY=your_groq_api_key_here
```

Get a **free** Groq API key (no credit card needed) at: [https://console.groq.com/keys](https://console.groq.com/keys)

### 4. Run the server

```bash
npm run dev
```

Expected output:
```
Server running on http://localhost:5000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (defaults to 3000) | Port the Express server listens on |
| `AI_API_KEY` | Yes | Your Groq API secret key, used to authenticate AI calls |

---

## API Documentation

### Endpoint

```
POST /api/classify
```

### Request Body

```json
{
  "text": "My order hasn't arrived in 2 weeks, this is unacceptable."
}
```

### Successful Response — `200 OK`

```json
{
  "category": "Complaint",
  "confidence": 0.95
}
```

### Example requests and responses

| Input text | Returned category |
|---|---|
| "My order hasn't arrived in 2 weeks, this is unacceptable." | Complaint |
| "What time does the store open tomorrow?" | Query |
| "I think the app would be better with dark mode." | Feedback |
| "The sky is blue today." | Other |

### Error Responses

| Status Code | Scenario | Response Body |
|---|---|---|
| `400` | `text` field missing | `{"error": "Field \"text\" is required."}` |
| `400` | `text` is not a string (e.g. number) | `{"error": "Field \"text\" must be a string."}` |
| `400` | `text` is an empty string | `{"error": "Field \"text\" cannot be empty."}` |
| `400` | `text` exceeds 2000 characters | `{"error": "Field \"text\" exceeds maximum length of 2000 characters."}` |
| `503` | Groq API times out, is unreachable, or key is invalid | `{"error": "AI classification service is temporarily unavailable. Please try again later."}` |
| `500` | Any other unexpected server error | `{"error": "Failed to classify text. Please try again later."}` |

---

## How AI Was Used

**Model:** `openai/gpt-oss-20b`, served via Groq's OpenAI-compatible chat completion endpoint.

**Prompt design:**
```
Classify the following text into exactly ONE of these categories: Complaint, Query, Feedback, Other.

Respond with ONLY a valid JSON object in this exact format, nothing else:
{"category": "<one of Complaint|Query|Feedback|Other>", "confidence": <a number between 0 and 1>}

Text: "<user's input text>"
```

Design choices behind this prompt:
- **Closed category set stated explicitly** — reduces the AI inventing categories outside the four allowed.
- **Strict "respond with ONLY JSON" instruction** — makes parsing predictable and machine-readable, instead of dealing with conversational filler text.
- **`temperature: 0.2`** — kept deliberately low so the same/similar input consistently gets classified the same way, rather than varying between calls.

**Handling missing confidence:** The assignment explicitly allows for the AI not returning a confidence score. My service checks whether the parsed `confidence` is a valid number between 0 and 1; if not, it substitutes a default value (`0.5`) rather than failing.

**Fallback classification (my own logic, not AI-generated):** If the AI call fails outright (timeout, network error, invalid key) or returns text that isn't valid/parseable JSON, or the category returned isn't one of the four allowed values, the service falls back to a simple keyword-matching classifier I wrote myself:

```javascript
const fallbackClassification = (text) => {
  const lower = text.toLowerCase();
  if (/(bad|worst|angry|unacceptable|complain|disappointed|refund)/.test(lower)) {
    return { category: 'Complaint', confidence: 0.4 };
  }
  if (/\?|how|what|when|where|why|can i/.test(lower)) {
    return { category: 'Query', confidence: 0.4 };
  }
  if (/(suggest|feedback|could be better|recommend|improve)/.test(lower)) {
    return { category: 'Feedback', confidence: 0.4 };
  }
  return { category: 'Other', confidence: 0.3 };
};
```

This guarantees the API **never crashes or returns a broken response**, even if the AI provider is down — a small but deliberate reliability design choice.

---

## Error Handling

Error handling is layered across the controller and service:

- **Controller layer** validates the shape of the request before any AI call is made (missing field, wrong type, empty string, oversized input) — this fails fast and avoids wasting an AI call on obviously invalid input.
- **Service layer** wraps the AI call in its own try/catch, tags AI-specific failures with a custom `isAiServiceError` flag, and applies a 10-second timeout so a slow/hanging AI provider can't freeze the whole request.
- **Controller layer (again)** checks for that flag to return a more accurate `503 Service Unavailable` instead of a generic `500`, distinguishing "the AI provider is having issues" from "something broke in my own code."

---

## Testing

A ready-to-import Postman collection is included: [`postman_collection.json`](./postman_collection.json). It contains 7 pre-built requests covering all three real categories, an "Other" example, and three error/edge cases (empty text, missing field, non-string input).

**To use it:** open Postman → File → Import → select `postman_collection.json`.

You can also test directly from the command line:

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/classify" -Method Post -Body '{"text":"What time does the store open tomorrow?"}' -ContentType "application/json"
```

**curl:**
```bash
curl -X POST http://localhost:5000/api/classify -H "Content-Type: application/json" -d '{"text": "What time does the store open tomorrow?"}'
```

---

## Development Journey : What I Built, Step by Step

I approached this assignment the way I'd approach a real production task: plan the contract first, then build layer by layer, testing at every step rather than writing everything and debugging at the end.

1. **Planned the request/response contract before writing any code** : decided on the exact shape of the input (`{ text }`) and output (`{ category, confidence }`) upfront, so every later layer had a clear target to build toward.
2. **Scaffolded the project** : initialized `npm`, installed `express`, `dotenv`, `cors`, `axios`, and `nodemon`, and set up a clean folder structure (`controllers/`, `services/`, `routes/`) instead of a single flat file, to keep responsibilities separated.
3. **Built the Express app skeleton first** (`app.js` + `server.js`) with a 404 handler and a global error handler in place *before* adding any real routes : so the app had a safety net from the start.
4. **Wired up routing** (`POST /api/classify`) before the controller/service existed, deliberately, to confirm the app structure and imports were correct (I expected - and got - a "module not found" error at this stage, which confirmed the wiring was right and only the file was missing).
5. **Built the controller and service layer together** : controller for input validation and HTTP response shaping, service for the actual Groq API call and response parsing.
6. **Chose Groq as the AI provider** after checking that OpenAI's API no longer offers reliable free credits for new accounts - Groq offered a genuinely free tier with no credit card, which fit an assignment context well.
7. **Designed the prompt and picked a model** : initially picked `llama-3.3-70b-versatile`, but on checking Groq's live model list, that model wasn't available anymore, so I switched to `openai/gpt-oss-20b`, which worked correctly and reliably returns structured JSON.
8. **Hardened error handling** : added input length limits, type checks, a request timeout on the AI call, and a custom error flag to distinguish "AI provider issue" from "my own bug," so the API responds with accurate status codes in every failure scenario.
9. **Wrote the fallback classifier** : my own keyword-based logic, used only when the AI response is unusable, so the API is resilient even if the AI provider is completely down.
10. **Built and tested the Postman collection** : created requests covering all four categories plus edge cases, and verified them against the running server.
11. **Wrote this README** and prepared the GitHub repository for submission.

---

## Challenges Faced & How I Solved Them

**1. Free AI API access**
Initially assumed OpenAI's API would offer free trial credits, but discovered new accounts no longer reliably get free credits. **Solution:** researched genuinely free, no-credit-card alternatives and switched to Groq, which offers a free tier well-suited for an assignment-scale project.

**2. Chosen AI model was deprecated**
The model I initially picked (`llama-3.3-70b-versatile`) wasn't available in Groq's current model list when I went to test it. **Solution:** checked Groq's live model directory in the dashboard and swapped to `openai/gpt-oss-20b`, confirming compatibility before continuing.

**3. `curl` and Postman failing with `ECONNREFUSED` while the server was clearly running**
This was the trickiest issue. The server logs showed "Server running on http://localhost:5000," and the browser could reach the endpoint fine, but `curl` (both Git Bash's and Windows' native `curl.exe`) and Postman both failed to connect.
- **Diagnosis process:** tested the same request across four different clients (browser, curl via Git Bash, native `curl.exe`, and PowerShell's `Invoke-RestMethod`) to isolate whether the problem was the server, the network, or a specific client.
- **Finding:** the browser and PowerShell connected successfully; only `curl` and Postman failed — pointing to those specific processes being blocked (likely by antivirus/security software applying different trust levels to browsers versus command-line tools), rather than any problem with my server code.
- **Resolution:** used PowerShell (`Invoke-RestMethod`) as the primary manual testing tool, which proved the API logic was correct end-to-end. Postman later started working on its own (likely after a security prompt was resolved), and was then used to build and verify the final test collection.
- **Takeaway:** this taught me to isolate variables systematically when debugging — testing the same request across multiple tools quickly narrowed the problem down to a client-specific issue rather than wasting time re-checking server code that was already correct.

**4. Missing `package.json` fields after `npm init -y`**
The default `package.json` didn't include a `dev` script or `"type": "module"`, causing `npm run dev` to fail with "Missing script" and later `import` statements to fail with a module-type error. **Solution:** manually added the `scripts` block and `"type": "module"`, and verified `nodemon` was correctly listed under `devDependencies` (it had initially been installed globally rather than locally, which I corrected with `npm install --save-dev nodemon` so the project is self-contained for anyone who clones it).

**5. Handling unreliable AI output format**
AI responses can occasionally be malformed, wrapped in extra text, or omit the confidence field. **Solution:** wrapped JSON parsing in its own try/catch, validated the returned category against the fixed allowed list, validated confidence was a number between 0 and 1, and built a deterministic fallback classifier so the API's output contract is *always* honored regardless of what the AI returns.

---

## Possible Future Improvements

- Add automated unit/integration tests (e.g. Jest + Supertest) for the controller and service layers
- Add request rate limiting to prevent abuse of the AI endpoint
- Add structured logging (e.g. Winston) instead of `console.error`
- Support batch classification (array of texts in one request)
- Add caching for repeated/identical text inputs to reduce AI provider costs

---

**Author:** Susmita Das
**Assignment:** Backend Assignment 1 — AI-Assisted Text Classification API
**Submitted to:** Indus Net Technologies Ltd.
