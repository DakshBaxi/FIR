FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
# sentence-transformers is unused (embeddings come from Ollama) and pulls in multi-GB torch
RUN grep -v '^sentence-transformers' requirements.txt > requirements.docker.txt \
  && pip install --no-cache-dir -r requirements.docker.txt

COPY . .
# Strip Windows line endings in case git checked the script out with CRLF
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
