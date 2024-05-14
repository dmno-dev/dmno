import { dmnoNextConfigPlugin } from '@dmno/nextjs-integration';
/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // totally static mode - builds to `out` dir
  output: process.env.NEXT_OUTPUT_EXPORT ? 'export' : undefined, 

  // experimental: {
  //   instrumentationHook: true,
  // }
  // rest of user config...
};

export default dmnoNextConfigPlugin()(nextConfig);
