import os

from dotenv import load_dotenv
from langchain_ollama import ChatOllama


load_dotenv()


def create_chat_model(temperature: float = 0) -> ChatOllama:
    return ChatOllama(
        model=os.getenv("OLLAMA_MODEL", "qwen3:1.7b"),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        keep_alive=os.getenv("OLLAMA_KEEP_ALIVE", "30m"),
        temperature=temperature,
        reasoning=False,
        num_ctx=4096,
        num_predict=int(os.getenv("OLLAMA_NUM_PREDICT", "192")),
    )
