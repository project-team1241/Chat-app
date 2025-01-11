# Stage 1: Build the application using a full Node.js image
FROM node:18-alpine AS build

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY package.json package-lock.json ./ 

# Install dependencies (only production dependencies will be installed)
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Stage 2: Create a lightweight image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the installed node_modules and app code from the build stage
COPY --from=build /app /app

# Expose the port the app will run on
EXPOSE 8080

# Command to run the application (ensure it points to server.mjs if it's the entry point)
CMD ["node", "server.mjs"]
