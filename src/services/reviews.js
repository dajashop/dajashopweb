import { reviewsApi } from './dajaPlatform';

export const addReview = async (productId, userData, reviewData) => {
  await reviewsApi.add(productId, userData, reviewData);
  return { success: true };
};

export const getProductReviews = async (productId) => {
  try {
    return await reviewsApi.forProduct(productId);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
};
