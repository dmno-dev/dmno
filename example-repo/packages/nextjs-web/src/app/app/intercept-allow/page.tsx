import { headers } from "next/headers";

export default async function ServerTestPage() {

  // the response body includes "Cappuccino" which is set as a sensitive config item
  // so we want to make sure our `Response` patchign doesn't interfere with incoming response bodies
  const apiResp = await fetch('https://api.sampleapis.com/coffee/hot');  
  // console.log(apiResp);
  const drinks = await apiResp.json();

  return (
    <main>
      <h1>Intercept test</h1>
      <p>this page should be allowed to render</p>
      <p>Fetched response length = { drinks.length }</p>
    </main>
  );
}
