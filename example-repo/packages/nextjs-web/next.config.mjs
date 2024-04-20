import { dmnoNextConfigPlugin } from '@dmno/nextjs-integration';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: {
  //   instrumentationHook: true,
  // }
  // rest of user config...
};

export default dmnoNextConfigPlugin()(nextConfig);
