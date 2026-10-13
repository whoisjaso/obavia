/* The official blank forms, served from /forms in the browser and read from
   public/forms in tests. The bytes are the state's and the FTC's, unchanged. */
export async function formTemplate(name: string): Promise<Uint8Array> {
  if (typeof window !== 'undefined' && typeof fetch === 'function' && !(globalThis as { process?: { versions?: { node?: string } } }).process?.versions?.node) {
    const r = await fetch(`./forms/${name}`);
    if (!r.ok) throw new Error(`Form ${name} could not be loaded`);
    return new Uint8Array(await r.arrayBuffer());
  }
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  return new Uint8Array(await readFile(join(process.cwd(), 'public', 'forms', name)));
}
