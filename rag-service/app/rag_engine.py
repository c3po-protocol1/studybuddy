"""
LightRAG engine singleton.

Uses Anthropic Claude for LLM and OpenAI for embeddings (configurable via env vars).

All lightrag imports are deferred to inside functions so the module can be
imported in tests without lightrag being installed, and so mocks can be
applied via patch() before the first call.
"""
import os
from pathlib import Path
from functools import lru_cache

WORKING_DIR = Path(os.getenv("RAG_WORKING_DIR", "./lightrag_data"))
LLM_MODEL = os.getenv("LLM_MODEL", "claude-3-5-haiku-20241022")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")


async def _anthropic_llm_complete(
    prompt: str,
    system_prompt: str | None = None,
    history_messages: list = [],
    **kwargs,
) -> str:
    """Anthropic Claude completion function for LightRAG."""
    import anthropic  # type: ignore

    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    messages = [*history_messages, {"role": "user", "content": prompt}]

    create_kwargs: dict = {
        "model": LLM_MODEL,
        "max_tokens": 4096,
        "messages": messages,
    }
    if system_prompt:
        create_kwargs["system"] = system_prompt

    response = await client.messages.create(**create_kwargs)
    return response.content[0].text


@lru_cache(maxsize=1)
def _get_rag():  # pragma: no cover
    """Return a cached LightRAG instance (initialised once per process)."""
    try:
        from lightrag import LightRAG  # type: ignore
        from lightrag.llm import openai_embedding  # type: ignore
    except ImportError as exc:
        raise ImportError("lightrag-hku is not installed. Run: pip install lightrag-hku") from exc

    WORKING_DIR.mkdir(parents=True, exist_ok=True)

    return LightRAG(
        working_dir=str(WORKING_DIR),
        llm_model_func=_anthropic_llm_complete,
        embedding_func=openai_embedding,
    )


async def ingest_text(text: str) -> None:
    """Insert plain text into the LightRAG knowledge graph."""
    rag = _get_rag()
    await rag.ainsert(text)


async def query_rag(question: str, mode: str = "hybrid") -> str:
    """Query the knowledge graph and return an answer string."""
    try:
        from lightrag import QueryParam  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise ImportError("lightrag-hku is not installed") from exc

    rag = _get_rag()
    result = await rag.aquery(question, param=QueryParam(mode=mode))
    return result
