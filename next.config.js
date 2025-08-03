/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure external images for Google user avatars
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com', // GitHub avatars if needed
      'images.unsplash.com', // If you use any Unsplash images
    ],
  },
};

module.exports = nextConfig;
