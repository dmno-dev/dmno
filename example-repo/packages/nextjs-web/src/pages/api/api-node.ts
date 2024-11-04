import type { NextApiRequest, NextApiResponse } from 'next'

export const runtime = 'nodejs';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // console.log(typeof res);
  // console.log(res.constructor);
  // console.log(Object.getPrototypeOf(res.constructor.prototype));
  console.log(res.end.toString());

  const ofn = res.setHeader;
  // @ts-ignore
  // res.setHeader = function (...args) {
  //   console.log('patched set header');
  //   // @ts-ignore
  //   ofn.call(this, args);
  // }
  // console.log(res.setHeader.toString());

  // res.status(200).end("foo");
  // res.status(200).json({ foo: 2 });

  // console.log(res.status(200))
  res.status(200).json({
    PUBLIC_STATIC: DMNO_PUBLIC_CONFIG.PUBLIC_STATIC,
    PUBLIC_DYNAMIC: DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC,
    ...req.query.leak && {
      SECRET_FOO: DMNO_CONFIG.SECRET_DYNAMIC,
    }
  })
}
