import { Handler } from '@netlify/functions';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const handler: Handler = async (event) => {
  // Return environment variables status (safely - without exposing actual secrets)
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      pusher_app_id_set: !!process.env.PUSHER_APP_ID,
      pusher_key_set: !!process.env.PUSHER_KEY,
      pusher_secret_set: !!process.env.PUSHER_SECRET,
      pusher_cluster_set: !!process.env.PUSHER_CLUSTER,
      pusher_cluster: process.env.PUSHER_CLUSTER || 'not set',
      node_env: process.env.NODE_ENV || 'not set'
    })
  };
}; 