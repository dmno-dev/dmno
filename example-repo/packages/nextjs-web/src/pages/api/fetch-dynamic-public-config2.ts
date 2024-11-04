import type { NextApiRequest, NextApiResponse } from 'next'
    
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).json((globalThis as any)._DMNO_PUBLIC_DYNAMIC_OBJ)
}