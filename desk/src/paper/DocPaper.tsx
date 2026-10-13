/* One Desk document, drawn by the production desk's own components (its
   DocumentSheet switch), from the payload lib/paper.ts builds. */
import BillOfSalePreview from '@/components/documents/BillOfSalePreview';
import ContractPreview from '@/components/documents/ContractPreview';
import VehicleResponsibilityDocument from '@/components/documents/VehicleResponsibilityDocument';
import InsuranceAcknowledgmentDocument from '@/components/documents/InsuranceAcknowledgmentDocument';
import SalvageSaleDocument from '@/components/documents/SalvageSaleDocument';
import ConditionReportDocument, { type ConditionReportData } from '@/components/documents/ConditionReportDocument';
import { getDocStrings } from '@/lib/documents/i18n';
import { emptySignatures } from '@/lib/documents/shared';
import type { BillOfSaleData } from '@/lib/documents/billOfSale';
import type { ContractData } from '@/lib/documents/finance';
import type { VehicleResponsibilityDocumentData } from '@/components/documents/VehicleResponsibilityDocument';
import type { InsuranceAcknowledgmentData } from '@/lib/documents/insuranceAcknowledgment';
import type { SalvageSaleData } from '@/lib/documents/salvageSale';
import type { Section } from '@/lib/paper';

type Props = { section: Section; data: Record<string, unknown>; buyerSignature?: string | null; buyerSignatureDate?: string | null; pendingTranslation?: boolean };

export function DocPaper({ section, data, buyerSignature, buyerSignatureDate, pendingTranslation }: Props) {
  const language = data.language === 'es' ? 'es' : 'en';
  const signatures = { ...emptySignatures, buyerSignature: buyerSignature ?? '', buyerSignatureDate: buyerSignatureDate ?? '' };
  const sig = { buyerSignature: buyerSignature ?? null, buyerSignatureDate: buyerSignatureDate ?? null, dealerSignature: null, dealerSignatureDate: null };
  switch (section) {
    case 'billOfSale':
      return <BillOfSalePreview data={data as unknown as BillOfSaleData} signatures={signatures} strings={getDocStrings(language)}
        outstanding={data.outstanding as Parameters<typeof BillOfSalePreview>[0]['outstanding']} />;
    case 'financing':
      return <ContractPreview data={data as unknown as ContractData} signatures={signatures} strings={getDocStrings(language)} />;
    case 'vehicleResponsibility':
      return <VehicleResponsibilityDocument language={language} data={data as unknown as VehicleResponsibilityDocumentData} {...sig} />;
    case 'insuranceAcknowledgment':
      return <InsuranceAcknowledgmentDocument language={language} data={data as unknown as InsuranceAcknowledgmentData} {...sig} />;
    case 'salvageBillOfSale': case 'towAwayAcknowledgment': case 'buyerResponsibilityStatement':
      return <SalvageSaleDocument sheet={section} language={language} data={data as unknown as SalvageSaleData} {...sig} />;
    case 'conditionReport':
      return <ConditionReportDocument data={data as unknown as ConditionReportData} buyerSignature={buyerSignature} buyerSignatureDate={buyerSignatureDate} pendingTranslation={pendingTranslation} />;
  }
}
