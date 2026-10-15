# LegalAI

## Run the backend with Ollama

1. Install and start [Ollama](https://ollama.com/download).
2. Pull the configured model:

   ```powershell
   ollama pull qwen3:1.7b
   ```

3. Add the settings from `.env.example` to `.env`. Keep any other credentials
   needed by the features you use.
4. Start the backend from the `backend` directory:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   $env:PYTHONIOENCODING = "utf-8"
   python -m uvicorn main:app --host 127.0.0.1 --port 8000
   ```

   If the virtual environment has not been created, create it and install
   dependencies first:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   ```

5. In another terminal, start the frontend from `Frontend`:

   ```powershell
   npm install
   npm run dev
   ```

Set `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in `.env` to use a different local
Ollama server or model. `OLLAMA_KEEP_ALIVE` controls how long Ollama keeps the
model loaded (default: 30 minutes), avoiding repeated cold-start delays.
`OLLAMA_NUM_PREDICT` limits response length (default: 192 tokens) to keep local
inference responsive. Chat answers stream into the interface as they are
generated. Text generation runs through Ollama; features
that search the web, query Supabase, or use other third-party integrations
still require their respective services and credentials.
