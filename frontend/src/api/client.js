import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://127.0.0.1:8000'; // Note: Use your IP if testing on physical device

const client = axios.create({
  baseURL: API_URL,
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
