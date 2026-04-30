import api from './apiConfig';

const uploadService = {
  // Upload profile picture
  uploadProfilePicture: async (file) => {
    try {
      console.log('Uploading file:', file.name);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post('/upload/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      throw error.response?.data || error;
    }
  },
  
  // Test upload route
  testUpload: async () => {
    try {
      const response = await api.get('/upload/test');
      console.log('Test response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Test error:', error);
      throw error.response?.data || error;
    }
  }
};

export default uploadService;