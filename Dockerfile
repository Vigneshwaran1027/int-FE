# Use Chainguard's Wolfi base image with Node.js for building and running
FROM cgr.dev/chainguard/wolfi-base:latest AS app
 
# Install specific fixed version of glibc along with Node.js and npm
RUN apk add --no-cache glibc nodejs npm
 
# Set the working directory
WORKDIR /code
 
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
 
# Copy the application code
COPY . .
 
# Expose the port that the app will run on
EXPOSE 3000
 
# Run the React/Vite development server
CMD ["npm", "run", "dev", "--", "--host"]