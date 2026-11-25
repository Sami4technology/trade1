import { cookies } from 'next/headers';
import { verifySession } from './auth';
export async function getSession() { return verifySession((await cookies()).get('eq_session')?.value); }
