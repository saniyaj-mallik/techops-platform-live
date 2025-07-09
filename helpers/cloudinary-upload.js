import cloudinary from '@/lib/cloudinary';

// Reusable function to upload image buffer to Cloudinary
export async function uploadImageToCloudinary(base64, publicIdPrefix = 'login') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({
      folder: 'techops-screenshots',
      resource_type: 'image',
      public_id: `${publicIdPrefix}-${Date.now()}`
    }, (error, result) => {
      if (error) return reject(error);
      resolve({
        publicId: result.public_id,
        imageUrl: result.secure_url,
        size: result.bytes,
        meta: result
      });
    });
    uploadStream.end(Buffer.from(base64, 'base64'));
  });
}
