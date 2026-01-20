
# Python 3.10 Base Image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies (if needed for pyarrow/pandas extensions)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for caching)
COPY requirements.txt .

# Install Dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose Port
EXPOSE 5000

# Set Python path to find modules
ENV PYTHONPATH=/app

# Run the application
CMD ["python", "backend/app.py"]
