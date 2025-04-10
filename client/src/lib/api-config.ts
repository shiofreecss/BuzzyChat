// API Configuration
// This file provides configuration for API endpoints based on environment

// Determine if we're in development or production
const isDevelopment = import.meta.env.DEV;

// Set the API base URL based on environment
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000' // Local development server
  : ''; // Use relative URLs in production

export default API_BASE_URL; 