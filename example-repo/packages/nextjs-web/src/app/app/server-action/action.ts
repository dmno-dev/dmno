'use server'



export async function doServerAction(prevState: any, formData: FormData) {
  console.log('Server action!', DMNO_CONFIG.SECRET_DYNAMIC);
  return { message: DMNO_CONFIG.SECRET_DYNAMIC };
}