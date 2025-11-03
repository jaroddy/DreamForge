import axios from 'axios'

const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

try {
 const response = await axios.get(
   `https://api.meshy.ai/openapi/v2/text-to-3d?page_size=10`,
   { headers }
 );
 console.log(response.data);
} catch (error) {
 console.error(error);
}