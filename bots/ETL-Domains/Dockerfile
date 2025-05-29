# Use Python 3.11 as a base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install OS-level build tools if needed
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the ETL script
COPY certstream_etl.py /app/

# Default command runs certstream_etl.py
CMD ["python", "certstream_etl.py"]
