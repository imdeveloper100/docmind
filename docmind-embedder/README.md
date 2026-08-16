# docmind-embedder

A small FastAPI microservice that splits documents into overlapping chunks and turns text into
OpenAI embeddings (`text-embedding-3-small`).

## Requirements

- Python 3.10+
- An OpenAI API key

## Setup

```bash
cd docmind-embedder
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

Copy the example env file and add your key:

```bash
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

```
OPENAI_API_KEY=sk-...
```

## Run

```bash
uvicorn main:app --reload --port 8001
```

Interactive docs are at http://localhost:8001/docs.

CORS is open to all origins for local development. Lock this down before deploying anywhere
public.

## Endpoints

### `GET /health`

```bash
curl http://localhost:8001/health
```

```json
{ "status": "ok" }
```

### `POST /chunk-and-embed`

Splits `text` into ~500 token chunks with a ~50 token overlap and embeds each chunk.

```bash
curl -X POST http://localhost:8001/chunk-and-embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Your long document text goes here...", "documentId": "doc-123"}'
```

```json
{
  "chunks": [
    { "text": "Your long document text goes here...", "embedding": [0.0123, -0.0456] }
  ]
}
```

### `POST /embed-query`

```bash
curl -X POST http://localhost:8001/embed-query \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I reset my password?"}'
```

```json
{ "embedding": [0.0123, -0.0456] }
```

## Chunking

`chunking.py` implements a dependency-free recursive character splitter. It tries the separators
`\n\n`, `\n`, ` `, and finally a hard character cut, packs the resulting pieces into chunks, then
prefixes each chunk with the tail of the previous one so neighbouring chunks share context.

Token counts are approximated as `characters / 4`, so a 500 token target with a 50 token overlap
becomes 1800 characters of fresh content plus a 200 character overlap, keeping every chunk at or
under 2000 characters.
