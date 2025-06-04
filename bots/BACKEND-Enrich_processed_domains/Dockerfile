FROM python:3.11-slim

# Set workdir
WORKDIR /app

# Install OS dependencies if needed (like libmaxminddb if you use geoip2)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libmaxminddb0 \
    && rm -rf /var/lib/apt/lists/*

# Copy everything into container
COPY . /app

# Install Python dependencies (add your actual deps in requirements.txt)
RUN pip install --no-cache-dir -r requirements.txt

# Default run command
CMD ["python", "enrich_processed_domain.py"]
