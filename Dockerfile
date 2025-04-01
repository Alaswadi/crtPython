FROM python:3.11-slim

# Install system dependencies and Go
RUN apt-get update && apt-get install -y \
    git \
    golang \
    && rm -rf /var/lib/apt/lists/*

# Set Go environment
ENV GOPATH /root/go
ENV PATH $GOPATH/bin:$PATH

# Install Go tools
RUN go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && \
    go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    go install -v github.com/lc/gau/v2/cmd/gau@latest

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create output directory
RUN mkdir -p output

# Expose port 9000
EXPOSE 9000

# Run the application
CMD ["python", "app.py"] 