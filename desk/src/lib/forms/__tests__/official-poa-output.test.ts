import { expect, it } from 'vitest';
import { PDFArray, PDFDocument, PDFRawStream } from '@cantoo/pdf-lib';
import { repairGeneratedPoaPdf } from '@/lib/documents/official-template-pdf';
import { fillPowerOfAttorney } from '@/lib/documents/powerOfAttorneyForm';
function streams(pdf:PDFDocument){const entry=pdf.getPage(0).node.Contents();return (entry instanceof PDFArray?entry.asArray():entry?[entry]:[]).map(ref=>pdf.context.lookup(ref)).filter((value):value is PDFRawStream=>value instanceof PDFRawStream).map(value=>Buffer.from(value.getContents()).toString('base64'));}
it('repairs the filled POA index without adding pages or changing form fields or page content',async()=>{
 const bytes=await fillPowerOfAttorney({vin:'1HGCM82633A004352',year:'2003',make:'Honda',model:'Accord',grantorName:'Avery Collins'});
 const before=await PDFDocument.load(bytes,{ignoreEncryption:true});
 const after=await PDFDocument.load(await repairGeneratedPoaPdf(bytes));
 expect(after.isEncrypted).toBe(false);expect(after.getPageCount()).toBe(before.getPageCount());
 expect(streams(after)).toEqual(streams(before));
 const text=(pdf:PDFDocument)=>pdf.getForm().getFields().map(field=>[field.getName(),'getText' in field?(field as {getText():string}).getText():null]);
 expect(text(after)).toEqual(text(before));
});
