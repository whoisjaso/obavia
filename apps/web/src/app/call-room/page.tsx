import { redirect } from 'next/navigation';

/** The v1 Call Room is gone: the in-call screen lives on the Dial front door (`/`). */
export default function CallRoomPage() {
  redirect('/');
}
