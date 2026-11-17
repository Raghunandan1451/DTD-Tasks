# Use lightweight Node.js image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Enable yarn via corepack
RUN corepack enable

# Copy only package files first (for caching)
COPY package.json yarn.lock ./

# The Electron binary is only needed for the desktop build, never in this container
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

# Install all dependencies (including dev)
RUN yarn install

# Copy the rest of the code
COPY . .

# Expose Vite dev port
EXPOSE 5173

# Run dev server
CMD ["yarn", "dev"]
