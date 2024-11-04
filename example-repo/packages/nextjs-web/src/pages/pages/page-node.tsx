import { useRouter } from "next/router";

export const runtime = 'nodejs';



// This gets called on every request
export async function getServerSideProps(context: any) {
  console.log('DMNO_CONFIG.SECRET_DYNAMIC = ', DMNO_CONFIG.SECRET_DYNAMIC);
  // Pass data to the page via props
  return {
    props: {
      data: context.query.leak ? DMNO_CONFIG.SECRET_DYNAMIC : DMNO_PUBLIC_CONFIG.PUBLIC_DYNAMIC
    }
  };
}

export default function Page(req: any) {
  const router = useRouter()
  return <div>
    <ul>
      <li><b>Runtime:</b> Nodejs</li>
      <li><b>Router:</b> Pages</li>
      <li><b>Server side data:</b> { req.data }</li>
    </ul>
  </div>;
}