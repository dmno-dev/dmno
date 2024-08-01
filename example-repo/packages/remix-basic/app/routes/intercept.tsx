import { ActionFunctionArgs, json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData , Form, useActionData } from "@remix-run/react";
import { ClientOnly } from "remix-utils/client-only";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

// THIS WOULD GET CAUGHT BY SCANNING CLIENT CHUNKS
// console.log(DMNO_CONFIG.SECRET_STATIC);

export async function action({
  request,
}: ActionFunctionArgs) {
  const body = await request.formData();

  if (body.get("leak")) {
    const apiResp = await fetch('https://api.sampleapis.com/beers/ale', {
      // const apiResp = await fetch('https://api.my-logging-provider.com/ingest', {
        headers: {
          'x-custom-auth': DMNO_CONFIG.STRIPE_SECRET_KEY,
          'x-another': 'bloop',
        },
      });
      const beers = await apiResp.json();
  }

  return json({
    foo: 1,
    result: 'action-data',
  });
}


export async function loader({ request }: LoaderFunctionArgs) {
  console.log('executing loader');
  const url = new URL(request.url);

  if (url.searchParams.get('leak')) {
    const apiResp = await fetch('https://api.sampleapis.com/beers/ale', {
    // const apiResp = await fetch('https://api.my-logging-provider.com/ingest', {
      headers: {
        'x-custom-auth': DMNO_CONFIG.STRIPE_SECRET_KEY,
        'x-another': 'bloop',
      },
    });
    const beers = await apiResp.json();
  }

  return json({
    result: 'loader-data'
  });
}


export default function Index() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  console.log({ loaderData, actionData });

  return (    
    <div className="font-sans p-4">
      <h1 className="text-3xl">Interceptor test</h1>

      <p>Add `?leak=1` to the URL to trigger a leak in the loader</p>
      <p>Or check the leak box below and click "submit" to trigger a leak during an action</p>

      <ul className="list-disc mt-4 pl-6 space-y-2">
        <li>loader data: { loaderData.result }</li>
        <li>action data: { actionData?.result }</li>
      </ul>

      <Form method="post">
        <label><input type="checkbox" name="leak" /> Leak?</label>
        <button type="submit">Submit</button>
      </Form>
    </div>
  );
}
