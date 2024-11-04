'use client'

export const runtime = 'nodejs';

import { useFormState } from "react-dom";
import { doServerAction } from "./action";

const initialState = {
  message: null as string | null,
}

export default function ServerActionTestPage(req: any) {
  
  const [state, formAction] = useFormState(doServerAction, initialState);

  return (
    <main>
      <h1>Server action test</h1>
      <form action={formAction}>
        <button type="submit">Trigger server action</button>
      </form>
      <p>Message = {state.message}</p>

    </main>
  )
}
