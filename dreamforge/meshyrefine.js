import axios from 'axios'

const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
const payload = {
  mode: 'refine',
  preview_task_id: '018a210d-8ba4-705c-b111-1f1776f7f578',
  enable_pbr: true,
};

try {
  const response = await axios.post(
    'https://api.meshy.ai/openapi/v2/text-to-3d',
    payload,
    { headers }
  );
  console.log(response.data);
} catch (error) {
  console.error(error);
}