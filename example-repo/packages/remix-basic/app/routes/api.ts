import { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs): Promise<any> {
  const url = new URL(request.url);

  return Response.json({
    PUBLIC_STATIC: DMNO_CONFIG.PUBLIC_STATIC,
    PUBLIC_DYNAMIC: DMNO_CONFIG.PUBLIC_DYNAMIC,
    
    // hit with ?leak=1 to trigger leak detection
    ...url.searchParams.get('leak') && {
      leak: DMNO_CONFIG.SECRET_STATIC,
    }
  });
}
