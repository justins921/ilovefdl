import { ApiClient } from '@ilovefdl/shared';

const api = new ApiClient(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

export default api;
