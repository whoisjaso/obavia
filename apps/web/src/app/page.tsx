import { redirect } from 'next/navigation';

/** The root has no content of its own; Today is the home screen. */
export default function RootPage() {
  redirect('/today');
}
