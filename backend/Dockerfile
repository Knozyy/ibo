FROM python:3.12-slim

WORKDIR /app

# Sistem bağımlılıkları (ffmpeg yt-dlp için gerekli)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Varsayılan CMD — docker-compose'da override edilir
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
