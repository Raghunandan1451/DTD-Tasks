# Use lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy only package files first (for caching)
COPY package.json yarn.lock ./

# Install all dependencies (including dev)
RUN yarn install

# Copy the rest of the code
COPY . .

# Expose Vite dev port
EXPOSE 5173

# Run dev server
CMD ["yarn", "dev"]
