import axios from "axios";

const API_URL = "http://localhost:5005/api";

export const getListings = async (lat, lng, radius, type) => {
  const { data } = await axios.get(`${API_URL}/listings`, { params: { lat, lng, radius, type } });
  return data;
};

export const createListing = async (listingData) => {
  const { data } = await axios.post(`${API_URL}/listings`, listingData);
  return data;
};

export const getMyListings = async (userId) => {
  const { data } = await axios.get(`${API_URL}/listings/user/${userId}`);
  return data;
};

export const deleteListing = async (id, userId) => {
  const { data } = await axios.delete(`${API_URL}/listings/${id}`, { data: { userId } });
  return data;
};