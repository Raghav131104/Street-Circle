import axios from "axios";

// Automatically detects backend if running locally
const API_URL = "http://localhost:5005/api";

export const getListings = async (lat, lng, radius, type) => {
  const { data } = await axios.get(`${API_URL}/listings`, {
    params: { lat, lng, radius, type }
  });
  return data;
};

export const createListing = async (listingData) => {
  const token = localStorage.getItem("token");
  const { data } = await axios.post(`${API_URL}/listings`, listingData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const getMyListings = async () => {
  const token = localStorage.getItem("token");
  const { data } = await axios.get(`${API_URL}/listings/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const deleteListing = async (id) => {
  const token = localStorage.getItem("token");
  const { data } = await axios.delete(`${API_URL}/listings/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};
