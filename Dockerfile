FROM node:22-bookworm

# Install system dependencies required by Chrome Headless, FFmpeg, and Vietnamese fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    ffmpeg \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-noto-core \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces runs container with user ID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PORT=7860 \
    NODE_ENV=production

WORKDIR /home/user/app

# Copy package config and install Full Remotion Ecosystem on the Cloud
COPY --chown=user package.json ./
RUN npm install

# Pre-download Chrome Headless Shell during Docker build so renders start immediately
RUN npx remotion browser ensure

# Copy application source files
COPY --chown=user tsconfig.json ./
COPY --chown=user src ./src

EXPOSE 7860

CMD ["npm", "start"]
