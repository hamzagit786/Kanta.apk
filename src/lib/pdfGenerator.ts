import { jsPDF } from 'jspdf';
import { 
  KantaEntry, 
  Driver, 
  PersonalPerson, 
  PersonalLoan, 
  PersonalRepayment, 
  OtherExpense,
  ExpensePayment 
} from '../types';
import { formatDate } from './formatters';

export interface SavePdfResult {
  success: boolean;
  filename: string;
  location: string;
  blob: Blob | null;
  canShare: boolean;
  error?: string;
}

/**
 * Format currency amounts with clean standard English numbers (0-9)
 */
function formatEnglishPKR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rs. 0';
  }
  const cleanNum = Math.round(Number(amount));
  return `Rs. ${cleanNum.toLocaleString('en-US')}`;
}

/**
 * Helper to safely check if native Capacitor platform is available
 */
async function isCapacitorNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Universal safe function to save PDF to Mobile device (Downloads / Documents)
 */
export async function savePdfToDevice(
  doc: jsPDF,
  preferredFilename: string,
  title: string = 'Hamza Computerized Kanta Record'
): Promise<SavePdfResult> {
  // Ensure .pdf extension
  const cleanFilename = preferredFilename.endsWith('.pdf')
    ? preferredFilename
    : `${preferredFilename}.pdf`;

  try {
    // Generate standard PDF binary blob
    const pdfBlob = doc.output('blob');
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    const isNative = await isCapacitorNative();

    if (isNative) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');

        // Save directly to Documents folder on Android
        await Filesystem.writeFile({
          path: cleanFilename,
          data: pdfBase64,
          directory: Directory.Documents,
          recursive: true,
        });

        // Also attempt write to Download folder
        try {
          await Filesystem.writeFile({
            path: `Download/${cleanFilename}`,
            data: pdfBase64,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
        } catch {
          // If direct Download subfolder requires Scoped Storage, Documents is already saved
        }

        // Trigger browser download in native WebView to ensure it shows in notification tray
        try {
          const blobUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = cleanFilename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 3000);
        } catch {
          // Ignore webview link click fallback failure
        }

        return {
          success: true,
          filename: cleanFilename,
          location: 'Saved to Android Documents & Downloads folder. Accessible via File Manager.',
          blob: pdfBlob,
          canShare: true,
        };
      } catch (nativeErr: unknown) {
        console.warn('Native storage write error, falling back to Web download:', nativeErr);
      }
    }

    // Web & Android WebView Fallback: Standard Blob Download
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 4000);

    return {
      success: true,
      filename: cleanFilename,
      location: 'Saved to Downloads folder on your phone. Accessible via File Manager or Downloads.',
      blob: pdfBlob,
      canShare: typeof navigator !== 'undefined' && !!navigator.share,
    };
  } catch (err: unknown) {
    console.error('Failed to generate or save PDF:', err);
    return {
      success: false,
      filename: cleanFilename,
      location: 'Failed to save',
      blob: null,
      canShare: false,
      error: err instanceof Error ? err.message : 'Unknown error saving PDF file.',
    };
  }
}

/**
 * Universal share function for Android & Web
 */
export async function sharePdfFile(
  blob: Blob,
  filename: string,
  title: string = 'Hamza Computerized Kanta Slip'
): Promise<boolean> {
  try {
    const isNative = await isCapacitorNative();

    if (isNative) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        const fileUriResult = await Filesystem.getUri({
          directory: Directory.Documents,
          path: filename,
        });

        await Share.share({
          title,
          text: `${title} - Hamza Computerized Kanta | Phone: 03257833708`,
          url: fileUriResult.uri,
          dialogTitle: `Share ${filename}`,
        });
        return true;
      } catch (nativeShareErr) {
        console.warn('Native share failed, trying Web Share API:', nativeShareErr);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: `${title} - Hamza Computerized Kanta | Phone: 03257833708`,
          files: [file],
        });
        return true;
      }
    }

    // Direct browser preview
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    return true;
  } catch (err) {
    console.warn('Share cancelled or not supported:', err);
    return false;
  }
}

/**
 * 1. Generate Weight Slip PDF (A5 Format Weighbridge Slip)
 * Pure English, standard numbers, clean typography, zero corrupted characters
 */
export function generateWeightSlipPdf(
  entry: KantaEntry,
  driver?: Driver | null,
  businessName: string = 'Hamza Computerized Kanta',
  ownerName: string = 'Hamza Siddique',
  phone: string = '03257833708'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = 148;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 148, 210, 'F');

  // Double border
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.8);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, 194);
  doc.setLineWidth(0.2);
  doc.rect(margin - 1, margin - 1, contentWidth + 2, 192);

  // Top Header Banner
  doc.setFillColor(29, 78, 216);
  doc.rect(margin, margin, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(businessName.toUpperCase(), pageWidth / 2, margin + 7, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('100-TON COMPUTERIZED ELECTRONIC WEIGHBRIDGE', pageWidth / 2, margin + 12.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text(`Proprietor: ${ownerName} | Phone: ${phone}`, pageWidth / 2, margin + 17, { align: 'center' });
  doc.text('Main G.T. Road, Punjab, Pakistan', pageWidth / 2, margin + 21, { align: 'center' });

  // Slip Metadata Strip
  let y = margin + 27;
  const slipId = (entry.id || '0000').substring(entry.id.length - 6).toUpperCase();
  const dateStr = entry.date || formatDate(new Date().toISOString());

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 9, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`SLIP NO: HK-${slipId}`, margin + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${dateStr}`, pageWidth / 2 - 5, y + 6);

  const isPaid = entry.duePrice <= 0;
  if (isPaid) {
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text('STATUS: FULLY PAID', pageWidth - margin - 3, y + 6, { align: 'right' });
  } else {
    doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.text(`Remaining Balance: ${formatEnglishPKR(entry.duePrice)}`, pageWidth - margin - 3, y + 6, { align: 'right' });
  }

  // Driver & Vehicle Card
  y += 12;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 24, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 24, 'S');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('DRIVER & VEHICLE DETAILS', margin + 3, y + 5);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 3, y + 6.5, pageWidth - margin - 3, y + 6.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Driver Name:', margin + 3, y + 11.5);
  doc.text('Vehicle Type:', margin + 3, y + 16.5);
  doc.text('Vehicle Number:', margin + 3, y + 21.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const dName = entry.driverName || driver?.name || 'Customer';
  doc.text(dName, margin + 32, y + 11.5);
  doc.text(entry.vehicleCategory || driver?.vehicleCategory || 'Loader Rickshaw', margin + 32, y + 16.5);

  const regNo = entry.vehicleReg || driver?.vehicleReg || 'N/A';
  doc.text(regNo, margin + 32, y + 21.5);

  const dPhone = driver?.phone || 'N/A';
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Driver Phone:', pageWidth / 2 + 5, y + 11.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(dPhone, pageWidth / 2 + 28, y + 11.5);

  // Weight Calculations Section
  y += 28;
  doc.setFillColor(30, 64, 175);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('WEIGHT MEASUREMENT', margin + 3, y + 4.8);
  doc.text('READING (KG)', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  y += 7;
  const num1st = entry.firstWeight !== '' ? Number(entry.firstWeight) : 0;
  const num2nd = entry.secondWeight !== '' ? Number(entry.secondWeight) : 0;
  const num3rd = entry.thirdWeight !== '' ? Number(entry.thirdWeight) : 0;
  const netWeight = num1st > 0 && num2nd > 0 ? Math.abs(num1st - num2nd) : 0;
  const maunds = (netWeight / 40).toFixed(2);

  // Row 1 - 1st Weight
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 7, 'S');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text('1st Weight (Gross Weight):', margin + 3, y + 4.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(num1st > 0 ? `${num1st.toLocaleString('en-US')} KG` : '---', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  // Row 2 - 2nd Weight
  y += 7;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.rect(margin, y, contentWidth, 7, 'S');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text('2nd Weight (Tare Weight):', margin + 3, y + 4.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(num2nd > 0 ? `${num2nd.toLocaleString('en-US')} KG` : '---', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  // Optional 3rd Weight
  if (num3rd > 0) {
    y += 7;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.rect(margin, y, contentWidth, 7, 'S');
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'normal');
    doc.text('3rd Weight (Optional):', margin + 3, y + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${num3rd.toLocaleString('en-US')} KG`, pageWidth - margin - 3, y + 4.8, { align: 'right' });
  }

  // Net Weight Row
  y += 7;
  doc.setFillColor(219, 234, 254);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, contentWidth, 9, 'S');

  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('NET WEIGHT:', margin + 3, y + 6);
  doc.setFontSize(10);
  doc.text(
    netWeight > 0 ? `${netWeight.toLocaleString('en-US')} KG  (${maunds} Maunds)` : '0 KG',
    pageWidth - margin - 3,
    y + 6,
    { align: 'right' }
  );

  // Financial Table
  y += 13;
  doc.setFillColor(30, 64, 175);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('PAYMENT DETAILS', margin + 3, y + 4.8);
  doc.text('AMOUNT (PKR)', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  // Total Amount Row
  y += 7;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, contentWidth, 6.5, 'S');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Total Amount:', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatEnglishPKR(entry.totalPrice), pageWidth - margin - 3, y + 4.5, { align: 'right' });

  // Paid Amount Row
  y += 6.5;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.rect(margin, y, contentWidth, 6.5, 'S');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text('Paid Amount:', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(formatEnglishPKR(entry.receivedPrice), pageWidth - margin - 3, y + 4.5, { align: 'right' });

  // Remaining Balance Row
  y += 6.5;
  doc.setFillColor(entry.duePrice > 0 ? 255 : 240, entry.duePrice > 0 ? 241 : 253, entry.duePrice > 0 ? 242 : 244);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.rect(margin, y, contentWidth, 7, 'S');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Remaining Balance:', margin + 3, y + 4.8);
  doc.setTextColor(entry.duePrice > 0 ? 225 : 16, entry.duePrice > 0 ? 29 : 185, entry.duePrice > 0 ? 72 : 129);
  doc.text(formatEnglishPKR(entry.duePrice), pageWidth - margin - 3, y + 4.8, { align: 'right' });

  // Stamp and Signatures
  y += 14;
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, 40, 18);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL STAMP', margin + 20, y + 10, { align: 'center' });

  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - margin - 45, y + 12, pageWidth - margin - 3, y + 12);
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', pageWidth - margin - 24, y + 16, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`(${ownerName})`, pageWidth - margin - 24, y + 19, { align: 'center' });

  // Bottom Notice
  const bottomY = 197;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, bottomY - 3, pageWidth - margin, bottomY - 3);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text(
    'Certified Computerized Weight Slip | Hamza Computerized Kanta | Main G.T. Road | Phone: 03257833708',
    pageWidth / 2,
    bottomY,
    { align: 'center' }
  );

  return doc;
}

/**
 * 2. Generate Driver Ledger Statement PDF (A4 Format)
 * Pure English, clean table layout, standard numbers
 */
export function generateDriverStatementPdf(
  driver: Driver,
  entries: KantaEntry[],
  businessName: string = 'Hamza Computerized Kanta',
  ownerName: string = 'Hamza Siddique',
  phone: string = '03257833708'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(29, 78, 216);
  doc.rect(margin, margin, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(businessName.toUpperCase(), pageWidth / 2, margin + 8, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('DRIVER WEIGHING KHATA STATEMENT', pageWidth / 2, margin + 14, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Owner: ${ownerName} | Phone: ${phone} | Main G.T. Road, Pakistan`, pageWidth / 2, margin + 19, { align: 'center' });

  // Driver details card
  let y = margin + 28;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 16, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 16, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Driver Name: ${driver.name}`, margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Vehicle Type: ${driver.vehicleCategory || 'Loader Rickshaw'} | Vehicle Number: ${driver.vehicleReg || 'N/A'}`, margin + 4, y + 11.5);

  doc.text(`Phone: ${driver.phone || 'N/A'}`, pageWidth / 2, y + 6);
  doc.text(`Date Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, y + 11.5);

  // Totals
  const totalBilled = entries.reduce((s, e) => s + (Number(e.totalPrice) || 0), 0);
  const totalReceived = entries.reduce((s, e) => s + (Number(e.receivedPrice) || 0), 0);
  const totalDue = entries.reduce((s, e) => s + (Number(e.duePrice) || 0), 0);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72);
  doc.text(`Remaining Balance: ${formatEnglishPKR(totalDue)}`, pageWidth - margin - 4, y + 6, { align: 'right' });
  doc.setTextColor(16, 185, 129);
  doc.text(`Paid Amount: ${formatEnglishPKR(totalReceived)}`, pageWidth - margin - 4, y + 11.5, { align: 'right' });

  // Table Header
  y += 20;
  doc.setFillColor(30, 64, 175);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Date', margin + 3, y + 4.8);
  doc.text('Vehicle Type / Number', margin + 28, y + 4.8);
  doc.text('1st Wt (KG)', margin + 78, y + 4.8);
  doc.text('2nd Wt (KG)', margin + 100, y + 4.8);
  doc.text('Net Wt (KG)', margin + 122, y + 4.8);
  doc.text('Total Amount', margin + 146, y + 4.8);
  doc.text('Paid Amount', margin + 166, y + 4.8);
  doc.text('Remaining Balance', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  y += 7;
  entries.forEach((e, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    const bg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6.5, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const net = e.firstWeight && e.secondWeight ? Math.abs(Number(e.firstWeight) - Number(e.secondWeight)) : 0;
    const vehicleLabel = e.vehicleReg ? `${e.vehicleCategory || 'Vehicle'} (${e.vehicleReg})` : (e.vehicleCategory || '---');

    doc.text(e.date || '---', margin + 3, y + 4.5);
    doc.text(vehicleLabel.substring(0, 26), margin + 28, y + 4.5);
    doc.text(e.firstWeight ? `${Number(e.firstWeight).toLocaleString('en-US')}` : '-', margin + 78, y + 4.5);
    doc.text(e.secondWeight ? `${Number(e.secondWeight).toLocaleString('en-US')}` : '-', margin + 100, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(net ? `${net.toLocaleString('en-US')}` : '-', margin + 122, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${Number(e.totalPrice).toLocaleString('en-US')}`, margin + 146, y + 4.5);
    doc.text(`${Number(e.receivedPrice).toLocaleString('en-US')}`, margin + 166, y + 4.5);
    if (e.duePrice > 0) {
      doc.setTextColor(225, 29, 72);
      doc.setFont('helvetica', 'bold');
    }
    doc.text(`${Number(e.duePrice).toLocaleString('en-US')}`, pageWidth - margin - 3, y + 4.5, { align: 'right' });

    y += 6.5;
  });

  return doc;
}

/**
 * 3. Generate Personal Loan / Udhar Voucher PDF (A5 Format)
 * Pure English, clean labels, zero unusual symbols
 */
export function generatePersonalLoanSlipPdf(
  loan: PersonalLoan,
  person: PersonalPerson,
  currentRemaining: number,
  businessName: string = 'Hamza Computerized Kanta',
  ownerName: string = 'Hamza Siddique',
  phone: string = '03257833708'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = 148;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const isBorrowed = loan.type === 'borrowed';

  // Double border
  const themeColor = isBorrowed ? [217, 119, 6] : [16, 185, 129];
  doc.setDrawColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.setLineWidth(0.8);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, 194);
  doc.setLineWidth(0.2);
  doc.rect(margin - 1, margin - 1, contentWidth + 2, 192);

  // Top Header Banner
  doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.rect(margin, margin, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(businessName.toUpperCase(), pageWidth / 2, margin + 7, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('PERSONAL LOAN & UDHAR KHATA VOUCHER', pageWidth / 2, margin + 12.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text(`Owner: ${ownerName} | Phone: ${phone}`, pageWidth / 2, margin + 17, { align: 'center' });
  doc.text('Official Account Receipt | Punjab, Pakistan', pageWidth / 2, margin + 21, { align: 'center' });

  // Slip Metadata Strip
  let y = margin + 27;
  const slipId = (loan.id || '0000').substring(loan.id.length - 6).toUpperCase();

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 9, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`VOUCHER NO: PL-${slipId}`, margin + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(loan.date)}`, pageWidth / 2 - 5, y + 6);

  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(
    isBorrowed ? 'TYPE: BORROWED' : 'TYPE: LENT',
    pageWidth - margin - 3,
    y + 6,
    { align: 'right' }
  );

  // Person Details Card
  y += 12;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 20, 'S');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT HOLDER DETAILS', margin + 3, y + 5);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 3, y + 6.5, pageWidth - margin - 3, y + 6.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Person Name:', margin + 3, y + 11.5);
  doc.text('Contact Phone:', margin + 3, y + 16.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(person.name, margin + 28, y + 11.5);
  doc.text(person.phone || 'N/A', margin + 28, y + 16.5);

  // Financial Table
  y += 24;
  doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('TRANSACTION BREAKDOWN', margin + 3, y + 4.8);
  doc.text('AMOUNT (PKR)', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  // Loan Amount
  y += 7;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 9, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(isBorrowed ? 'Total Amount (Borrowed):' : 'Total Amount (Lent):', margin + 3, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.text(formatEnglishPKR(loan.amount), pageWidth - margin - 3, y + 6, { align: 'right' });

  // Remaining Balance Row
  y += 9;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Remaining Balance:', margin + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatEnglishPKR(currentRemaining), pageWidth - margin - 3, y + 5.5, { align: 'right' });

  // Notes/Description Card
  y += 12;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 18, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTES / DESCRIPTION:', margin + 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const noteText = loan.notes || 'No extra notes provided for this transaction.';
  doc.text(noteText, margin + 3, y + 10, { maxWidth: contentWidth - 6 });

  // Stamp and Signature
  y += 24;
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, 40, 18);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL STAMP', margin + 20, y + 10, { align: 'center' });

  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - margin - 45, y + 12, pageWidth - margin - 3, y + 12);
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', pageWidth - margin - 24, y + 16, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`(${ownerName})`, pageWidth - margin - 24, y + 19, { align: 'center' });

  // Bottom Notice
  const bottomY = 197;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, bottomY - 3, pageWidth - margin, bottomY - 3);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text(
    'Hamza Computerized Kanta | Personal Khata Ledger | Phone: 03257833708',
    pageWidth / 2,
    bottomY,
    { align: 'center' }
  );

  return doc;
}

/**
 * 4. Generate Personal Repayment Slip PDF (A5 Format)
 * Pure English, clean labels, zero unusual symbols
 */
export function generatePersonalRepaymentSlipPdf(
  repayment: PersonalRepayment,
  person: PersonalPerson,
  loan: PersonalLoan | null,
  newRemaining: number,
  businessName: string = 'Hamza Computerized Kanta',
  ownerName: string = 'Hamza Siddique',
  phone: string = '03257833708'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = 148;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const isRepaidBorrowed = repayment.direction === 'repaid_borrowed';

  // Double border
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, 194);
  doc.setLineWidth(0.2);
  doc.rect(margin - 1, margin - 1, contentWidth + 2, 192);

  // Top Header Banner
  doc.setFillColor(16, 185, 129);
  doc.rect(margin, margin, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(businessName.toUpperCase(), pageWidth / 2, margin + 7, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('LOAN REPAYMENT OFFICIAL RECEIPT', pageWidth / 2, margin + 12.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text(`Owner: ${ownerName} | Phone: ${phone}`, pageWidth / 2, margin + 17, { align: 'center' });
  doc.text('Official Account Receipt | Punjab, Pakistan', pageWidth / 2, margin + 21, { align: 'center' });

  // Slip Metadata Strip
  let y = margin + 27;
  const slipId = (repayment.id || '0000').substring(repayment.id.length - 6).toUpperCase();

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 9, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`RECEIPT NO: RP-${slipId}`, margin + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(repayment.date)}`, pageWidth / 2 - 5, y + 6);

  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.text('STATUS: COMPLETED', pageWidth - margin - 3, y + 6, { align: 'right' });

  // Person Details Card
  y += 12;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 20, 'S');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT HOLDER DETAILS', margin + 3, y + 5);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 3, y + 6.5, pageWidth - margin - 3, y + 6.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Person Name:', margin + 3, y + 11.5);
  doc.text('Payment Type:', margin + 3, y + 16.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(person.name, margin + 28, y + 11.5);
  doc.text(
    isRepaidBorrowed ? 'Repayment of Borrowed Money' : 'Received Repayment of Lent Money',
    margin + 28,
    y + 16.5
  );

  // Financial Table
  y += 24;
  doc.setFillColor(16, 185, 129);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('REPAYMENT DETAILS', margin + 3, y + 4.8);
  doc.text('AMOUNT (PKR)', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  // Paid Amount
  y += 7;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 9, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Paid Amount:', margin + 3, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(formatEnglishPKR(repayment.amount), pageWidth - margin - 3, y + 6, { align: 'right' });

  // Remaining Balance Row
  y += 9;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Remaining Balance:', margin + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatEnglishPKR(newRemaining), pageWidth - margin - 3, y + 5.5, { align: 'right' });

  // Linked Loan reference if any
  if (loan) {
    y += 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.rect(margin, y, contentWidth, 8, 'S');

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Linked Loan Date: ${formatDate(loan.date)} | Original Total: ${formatEnglishPKR(loan.amount)}`, margin + 3, y + 5.5);
  }

  // Stamp and Signature
  y += 16;
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, 40, 18);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL STAMP', margin + 20, y + 10, { align: 'center' });

  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - margin - 45, y + 12, pageWidth - margin - 3, y + 12);
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', pageWidth - margin - 24, y + 16, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`(${ownerName})`, pageWidth - margin - 24, y + 19, { align: 'center' });

  // Bottom Notice
  const bottomY = 197;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, bottomY - 3, pageWidth - margin, bottomY - 3);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text(
    'Hamza Computerized Kanta | Personal Khata Ledger | Phone: 03257833708',
    pageWidth / 2,
    bottomY,
    { align: 'center' }
  );

  return doc;
}

/**
 * 5. Generate Personal Account Statement PDF (A4 Format)
 * Pure English, clean table layout, standard numbers
 */
export function generatePersonStatementPdf(
  person: PersonalPerson,
  loans: PersonalLoan[],
  repayments: PersonalRepayment[],
  balances: { remainingBorrowed: number; remainingLent: number; netPosition: number },
  businessName: string = 'Hamza Computerized Kanta',
  ownerName: string = 'Hamza Siddique',
  phone: string = '03257833708'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(29, 78, 216);
  doc.rect(margin, margin, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(businessName.toUpperCase(), pageWidth / 2, margin + 8, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PERSONAL LOAN & UDHAR STATEMENT OF ACCOUNT', pageWidth / 2, margin + 14, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Owner: ${ownerName} | Phone: ${phone} | Main G.T. Road, Pakistan`, pageWidth / 2, margin + 19, { align: 'center' });

  // Account details
  let y = margin + 28;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 18, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Account Holder: ${person.name}`, margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Phone: ${person.phone || 'N/A'}`, margin + 4, y + 12);
  doc.text(`Date Generated: ${new Date().toLocaleDateString('en-GB')}`, margin + 60, y + 12);

  doc.setFont('helvetica', 'bold');
  if (balances.netPosition > 0) {
    doc.setTextColor(16, 185, 129);
    doc.text(`Net Receivable from Person: ${formatEnglishPKR(balances.netPosition)}`, pageWidth - margin - 4, y + 6, { align: 'right' });
  } else if (balances.netPosition < 0) {
    doc.setTextColor(225, 29, 72);
    doc.text(`Net Payable to Person: ${formatEnglishPKR(Math.abs(balances.netPosition))}`, pageWidth - margin - 4, y + 6, { align: 'right' });
  } else {
    doc.setTextColor(71, 85, 105);
    doc.text('Account Settled (Rs. 0 Balance)', pageWidth - margin - 4, y + 6, { align: 'right' });
  }

  // Summary box
  y += 22;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Remaining Borrowed: ${formatEnglishPKR(balances.remainingBorrowed)}`, margin + 4, y + 6.5);
  doc.text(`Remaining Lent: ${formatEnglishPKR(balances.remainingLent)}`, margin + 75, y + 6.5);

  // Loans Table
  y += 14;
  doc.setFillColor(30, 64, 175);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Date', margin + 3, y + 4.8);
  doc.text('Type', margin + 30, y + 4.8);
  doc.text('Total Amount (PKR)', margin + 70, y + 4.8);
  doc.text('Notes / Description', margin + 115, y + 4.8);

  y += 7;
  loans.forEach((loan, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    const bg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg);
    doc.rect(margin, y, contentWidth, 6.5, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    doc.text(loan.date, margin + 3, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(loan.type === 'borrowed' ? 217 : 16, loan.type === 'borrowed' ? 119 : 185, loan.type === 'borrowed' ? 6 : 129);
    doc.text(loan.type === 'borrowed' ? 'Borrowed' : 'Lent', margin + 30, y + 4.5);

    doc.setTextColor(15, 23, 42);
    doc.text(formatEnglishPKR(loan.amount), margin + 70, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text((loan.notes || '-').substring(0, 45), margin + 115, y + 4.5);

    y += 6.5;
  });

  return doc;
}

/**
 * 6. Generate Operational Expense Voucher PDF (A5 Format)
 * Pure English, clean labels, zero unusual symbols
 */
export function generateExpenseVoucherPdf(
  expense: OtherExpense,
  businessName: string = 'Hamza Computerized Kanta',
  ownerName: string = 'Hamza Siddique',
  phone: string = '03257833708'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = 148;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const isCredit = expense.paymentStatus === 'credit';

  // Double border
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.8);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, 194);
  doc.setLineWidth(0.2);
  doc.rect(margin - 1, margin - 1, contentWidth + 2, 192);

  // Top Header Banner
  doc.setFillColor(29, 78, 216);
  doc.rect(margin, margin, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(businessName.toUpperCase(), pageWidth / 2, margin + 7, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('OPERATIONAL EXPENSE VOUCHER', pageWidth / 2, margin + 12.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text(`Owner: ${ownerName} | Phone: ${phone}`, pageWidth / 2, margin + 17, { align: 'center' });
  doc.text('Main G.T. Road, Punjab, Pakistan', pageWidth / 2, margin + 21, { align: 'center' });

  // Slip Metadata Strip
  let y = margin + 27;
  const slipId = (expense.id || '0000').substring(expense.id.length - 6).toUpperCase();

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 9, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`VOUCHER NO: EXP-${slipId}`, margin + 3, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(expense.date)}`, pageWidth / 2 - 5, y + 6);

  doc.setFont('helvetica', 'bold');
  if (isCredit) {
    doc.setTextColor(225, 29, 72);
    doc.text(`STATUS: CREDIT DUE (${formatEnglishPKR(expense.dueAmount ?? expense.amount)})`, pageWidth - margin - 3, y + 6, { align: 'right' });
  } else {
    doc.setTextColor(16, 185, 129);
    doc.text('STATUS: CASH PAID', pageWidth - margin - 3, y + 6, { align: 'right' });
  }

  // Expense Details Card
  y += 12;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 24, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 24, 'S');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPENSE SPECIFICATIONS', margin + 3, y + 5);

  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 3, y + 6.5, pageWidth - margin - 3, y + 6.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Category / Head:', margin + 3, y + 11.5);
  doc.text('Vendor / Creditor:', margin + 3, y + 16.5);
  doc.text('Payment Type:', margin + 3, y + 21.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(expense.category, margin + 32, y + 11.5);
  doc.text(expense.creditorName || 'Direct Vendor / Petty Cash', margin + 32, y + 16.5);
  doc.text(isCredit ? 'Credit' : 'Paid Cash', margin + 32, y + 21.5);

  // Financial Table
  y += 28;
  doc.setFillColor(30, 64, 175);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('PAYMENT DETAILS', margin + 3, y + 4.8);
  doc.text('AMOUNT (PKR)', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  // Total Expenses
  y += 7;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Total Expenses:', margin + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatEnglishPKR(expense.amount), pageWidth - margin - 3, y + 5.5, { align: 'right' });

  // Paid Amount
  y += 8;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Paid Amount:', margin + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(formatEnglishPKR(expense.paidAmount || 0), pageWidth - margin - 3, y + 5.5, { align: 'right' });

  // Remaining Balance (if credit)
  if (isCredit) {
    y += 8;
    doc.setFillColor(255, 241, 242);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.rect(margin, y, contentWidth, 8, 'S');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Remaining Balance:', margin + 3, y + 5.5);
    doc.setTextColor(225, 29, 72);
    doc.text(formatEnglishPKR(expense.dueAmount ?? expense.amount), pageWidth - margin - 3, y + 5.5, { align: 'right' });
  }

  // Description / Notes
  y += 12;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 18, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 18, 'S');

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION / NOTES:', margin + 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const desc = expense.description || 'No additional details noted.';
  doc.text(desc, margin + 3, y + 10, { maxWidth: contentWidth - 6 });

  // Stamp and Signature
  y += 24;
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, 40, 18);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL STAMP', margin + 20, y + 10, { align: 'center' });

  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - margin - 45, y + 12, pageWidth - margin - 3, y + 12);
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', pageWidth - margin - 24, y + 16, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`(${ownerName})`, pageWidth - margin - 24, y + 19, { align: 'center' });

  // Bottom Notice
  const bottomY = 197;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, bottomY - 3, pageWidth - margin, bottomY - 3);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text(
    'Hamza Computerized Kanta | Operational Expense Ledger | Phone: 03257833708',
    pageWidth / 2,
    bottomY,
    { align: 'center' }
  );

  return doc;
}

/**
 * 7. Generate Expense Payment Receipt PDF (A5 Format)
 * Pure English, clean labels, zero unusual symbols
 */
export function generateExpensePaymentVoucherPdf(
  payment: ExpensePayment,
  expense: OtherExpense | null,
  businessName: string = 'Hamza Computerized Kanta',
  ownerName: string = 'Hamza Siddique',
  phone: string = '03257833708'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = 148;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  // Double border
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, 194);
  doc.setLineWidth(0.2);
  doc.rect(margin - 1, margin - 1, contentWidth + 2, 192);

  // Top Header Banner
  doc.setFillColor(16, 185, 129);
  doc.rect(margin, margin, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(businessName.toUpperCase(), pageWidth / 2, margin + 7, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('CREDITOR PAYMENT RECEIPT', pageWidth / 2, margin + 12.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.text(`Owner: ${ownerName} | Phone: ${phone}`, pageWidth / 2, margin + 17, { align: 'center' });

  // Metadata
  let y = margin + 27;
  const slipId = (payment.id || '0000').substring(payment.id.length - 6).toUpperCase();

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 9, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`PAYMENT REF: PR-${slipId}`, margin + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(payment.date)}`, pageWidth / 2 - 5, y + 6);

  // Details
  y += 12;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 20, 'S');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Creditor / Expense Category:', margin + 3, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(expense?.creditorName || expense?.category || 'Creditor Payment', margin + 45, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Paid Amount:', margin + 3, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(formatEnglishPKR(payment.amount), margin + 45, y + 13);

  // Stamp and Signature
  y += 28;
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, 40, 18);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL STAMP', margin + 20, y + 10, { align: 'center' });

  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - margin - 45, y + 12, pageWidth - margin - 3, y + 12);
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', pageWidth - margin - 24, y + 16, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`(${ownerName})`, pageWidth - margin - 24, y + 19, { align: 'center' });

  return doc;
}
