import { registerAs } from '@nestjs/config';

export default registerAs('upload', () => ({
  imageStorage: process.env.IMAGE_STORAGE,
  fileStorage: process.env.FILE_STORAGE,

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    bucket: process.env.SUPABASE_BUCKET,
  },
}));
