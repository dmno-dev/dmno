// export const prerender = true;

export async function GET() {
  
  const apiResp = await fetch('https://api.sampleapis.com/coffee/hot');

  return new Response(JSON.stringify(await apiResp.json()));
}
