# Use Python 3.10 as the base image
FROM python:3.10

# Install Node.js, npm, Chrome dependencies, and other requirements
RUN apt-get update && apt-get install -y \
    build-essential \
    libev-dev \
    nodejs \
    npm \
    wget \
    gnupg \
    chromium \
    chromium-driver \
 && rm -rf /var/lib/apt/lists/*

# Install Lighthouse globally
RUN npm install -g lighthouse

# Set the working directory
WORKDIR /app

# Copy your Python requirements, then install them
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . /app

# Default command to run your script with arguments
CMD ["python", "enrich_processed_domains_lighthouse.py", "--lighthouse-path", "/usr/local/bin/lighthouse", "--debug"]
