FROM node:latest

WORKDIR /app

# Install dependencies required for building SQLite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies but don't build the native modules yet
RUN npm install --ignore-scripts

# Copy application code
COPY . .

# Rebuild SQLite3 properly for this environment
RUN npm rebuild sqlite3 --build-from-source

# Build TypeScript code
RUN npm run build

# Expose the port the app will run on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]