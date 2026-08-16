import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, Field

from chunking import split_text

load_dotenv()

EMBEDDING_MODEL = "text-embedding-3-small"

logger = logging.getLogger("docmind-embedder")

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY is not set. Copy .env.example to .env first.")

client = OpenAI(api_key=api_key)

app = FastAPI(title="docmind-embedder")

# Dev only: the service is expected to sit behind an authenticated backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChunkAndEmbedRequest(BaseModel):
    text: str
    documentId: str


class Chunk(BaseModel):
    text: str
    embedding: list[float]


class ChunkAndEmbedResponse(BaseModel):
    chunks: list[Chunk]


class EmbedQueryRequest(BaseModel):
    query: str = Field(min_length=1)


class EmbedQueryResponse(BaseModel):
    embedding: list[float]


def embed(texts: list[str]) -> list[list[float]]:
    try:
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    except OpenAIError as exc:
        logger.exception("Embedding request failed")
        raise HTTPException(status_code=502, detail=f"Embedding failed: {exc}") from exc
    return [item.embedding for item in response.data]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chunk-and-embed", response_model=ChunkAndEmbedResponse)
def chunk_and_embed(body: ChunkAndEmbedRequest) -> ChunkAndEmbedResponse:
    chunk_texts = split_text(body.text)
    if not chunk_texts:
        raise HTTPException(status_code=400, detail="text is empty")

    logger.info("Embedding %d chunks for document %s", len(chunk_texts), body.documentId)
    embeddings = embed(chunk_texts)

    return ChunkAndEmbedResponse(
        chunks=[
            Chunk(text=text, embedding=embedding)
            for text, embedding in zip(chunk_texts, embeddings)
        ]
    )


@app.post("/embed-query", response_model=EmbedQueryResponse)
def embed_query(body: EmbedQueryRequest) -> EmbedQueryResponse:
    return EmbedQueryResponse(embedding=embed([body.query])[0])
