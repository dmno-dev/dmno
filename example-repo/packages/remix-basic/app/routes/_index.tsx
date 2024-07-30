import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { ClientOnly } from "remix-utils/client-only";




export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader({
  request,
}: LoaderFunctionArgs) {

  console.log('executing loader');
  console.log('DMNO_CONFIG.SECRET_STATIC = ', DMNO_CONFIG.SECRET_STATIC);
  console.log('DMNO_CONFIG.SECRET_DYNAMIC = ', DMNO_CONFIG.SECRET_DYNAMIC);
  console.log('DMNO_CONFIG.PUBLIC_STATIC = ', DMNO_CONFIG.PUBLIC_STATIC);
  console.log('DMNO_CONFIG.PUBLIC_DYNAMIC = ', DMNO_CONFIG.PUBLIC_DYNAMIC);


  return json({
    foo: 1
  });
}

export default function Index() {
  console.log('log in page template fn', DMNO_PUBLIC_CONFIG.PUBLIC_STATIC, DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC);
  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">Welcome to Remix</h1>
      <ul className="list-disc mt-4 pl-6 space-y-2">
        {/* <li>DMNO_CONFIG.PUBLIC_STATIC = { DMNO_CONFIG.PUBLIC_STATIC }</li> */}
        <li>DMNO_PUBLIC_CONFIG.PUBLIC_STATIC = {DMNO_PUBLIC_CONFIG.PUBLIC_STATIC}</li>
        {/* <li>DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC = { DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC }</li> */}



        {/* throws because not a valid config item */}
        {/* <li>DMNO_PUBLIC_CONFIG.PUBLIC_STATIC = { DMNO_PUBLIC_CONFIG.BAD_KEY }</li> */}
      </ul>

      <hr />

      <ClientOnly>
        {() => <div>
          <h2>Client only</h2>
          <ul>
            <li>DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC = {DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC}</li>
          </ul>
        </div>}
      </ClientOnly>
    </div>
  );
}
