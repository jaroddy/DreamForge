import axios from 'axios'

const taskId = '018a210d-8ba4-705c-b111-1f1776f7f578';
const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };

try {
  const response = await axios.get(
    `https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`,
    { headers }
  );
  console.log(response.data);
} catch (error) {
  console.error(error);
}