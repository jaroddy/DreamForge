import axios from 'axios'

const headers = { Authorization: `Bearer ${YOUR_API_KEY}` };
const payload = {
  mode: 'preview',
  prompt: 'a monster mask',
  art_style: 'realistic',
  should_remesh: true
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
