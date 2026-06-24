import os
import logging
from typing import Optional

from dotenv import load_dotenv
load_dotenv() 

import chromadb
from chromadb.config import Settings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

logger = logging.getLogger(__name__)

COLLECTION_NAME = "build_failures"

_embeddings: Optional[HuggingFaceEmbeddings] = None
_chroma_client: Optional[chromadb.HttpClient] = None
_vector_store: Optional[Chroma] = None


def get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        logger.info("Loading HuggingFace embeddings model (all-MiniLM-L6-v2)...")
        _embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        logger.info("Embeddings model loaded.")
    return _embeddings


def get_chroma_client() -> chromadb.HttpClient:
    global _chroma_client
    if _chroma_client is None:
        host = os.getenv("CHROMA_HOST", "localhost")
        port = int(os.getenv("CHROMA_PORT", "8001"))
        logger.info(f"Connecting to ChromaDB at {host}:{port}")
        _chroma_client = chromadb.HttpClient(
            host=host,
            port=port,
            settings=Settings(anonymized_telemetry=False),
        )
    return _chroma_client


def get_vector_store() -> Chroma:
    global _vector_store
    if _vector_store is None:
        client = get_chroma_client()
        embeddings = get_embeddings()
        _vector_store = Chroma(
            client=client,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
        )
        logger.info(f"Vector store ready (collection: {COLLECTION_NAME})")
    return _vector_store


def embed_build_logs(
    build_id: str,
    repo: str,
    logs: list[dict],
    root_cause: str = "UNKNOWN",
    resolution: str = "",
) -> int:
    """
    Embed log steps for a build into ChromaDB.

    Each log dict must have keys: step_name, log_text
    Returns the number of documents upserted.
    """
    if not logs:
        logger.warning(f"No logs to embed for build {build_id}")
        return 0

    vs = get_vector_store()

    ids: list[str] = []
    texts: list[str] = []
    metadatas: list[dict] = []

    for log in logs:
        step_name = log.get("step_name", "unknown_step")
        log_text = log.get("log_text", "")

        doc_id = f"build_{build_id}_step_{step_name}"
        document = f"{step_name}: {log_text[:2000]}"

        ids.append(doc_id)
        texts.append(document)
        metadatas.append(
            {
                "build_id": build_id,
                "repo": repo,
                "root_cause": root_cause,
                "resolution": resolution,
                "step_name": step_name,
            }
        )

    # Chroma's add_texts handles upsert by id
    vs.add_texts(texts=texts, metadatas=metadatas, ids=ids)
    logger.info(f"Upserted {len(ids)} documents for build {build_id}")
    return len(ids)


def search_similar_failures(error_text: str, n: int = 5) -> list[dict]:
    """
    Vector-search ChromaDB for builds with similar error text.
    Returns a list of dicts with document text + metadata + score.
    """
    vs = get_vector_store()
    results = vs.similarity_search_with_relevance_scores(error_text, k=n)

    hits = []
    for doc, score in results:
        hits.append(
            {
                "text": doc.page_content,
                "metadata": doc.metadata,
                "score": round(score, 4),
            }
        )
    return hits


def count_documents() -> int:
    """Return total number of documents in the collection (for health checks)."""
    client = get_chroma_client()
    try:
        col = client.get_collection(COLLECTION_NAME)
        return col.count()
    except Exception:
        return 0