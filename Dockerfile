FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Create binary directory
RUN mkdir -p /usr/local/bin

# Download and install subfinder
RUN curl -LO https://github.com/projectdiscovery/subfinder/releases/download/v2.6.3/subfinder_2.6.3_linux_amd64.zip && \
    unzip subfinder_2.6.3_linux_amd64.zip && \
    mv subfinder /usr/local/bin/ && \
    rm subfinder_2.6.3_linux_amd64.zip

# Download and install httpx
RUN curl -LO https://github.com/projectdiscovery/httpx/releases/download/v1.3.7/httpx_1.3.7_linux_amd64.zip && \
    unzip httpx_1.3.7_linux_amd64.zip && \
    mv httpx /usr/local/bin/ && \
    rm httpx_1.3.7_linux_amd64.zip

# Download and install gau
RUN curl -LO https://github.com/lc/gau/releases/download/v2.1.2/gau_2.1.2_linux_amd64.tar.gz && \
    tar -xzf gau_2.1.2_linux_amd64.tar.gz && \
    mv gau /usr/local/bin/ && \
    rm gau_2.1.2_linux_amd64.tar.gz

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