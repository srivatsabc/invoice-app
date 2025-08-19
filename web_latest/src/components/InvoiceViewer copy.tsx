import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Save, Pencil, PlayCircle, RefreshCw, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Maximize2, Minimize2, Printer, Download, FileText, ExternalLink } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { API_BASE_URL } from '../constants/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface SelectionBox {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

interface InvoiceViewerProps {
  onClose: () => void;
  uploadedFile?: File | null;
  pdfUrl?: string;
  customPrompt?: string;
  templateName?: string;
  selectedVersion?: string;
  analysisResult?: {
    header: {
      region: string;
      country: string;
      vendor: string;
      invoiceNumber: string;
      vendorAddress: string;
      poNumber: string;
      taxId: string;
      shipmentNumber: string;
      receivedDate: string;
      processedDate: string;
      subtotal?: number;
      tax?: number;
      total?: number;
      currency?: string;
      issueDate?: string;
      dueDate?: string;
      taxPointDate?: string;
      buyerDetails?: string;
      buyerTaxId?: string;
      buyerCompanyRegId?: string;
      shipToDetails?: string;
      shipToCountryCode?: string;
      paymentInformation?: string;
      paymentTerms?: string;
      notes?: string;
      exchangeRate?: number;
      invoiceType?: string;
      status?: string;
      feedback?: string;
      extractionMethod?: string;
      processingMethod?: string;
    };
    lineItems: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      taxRate: number;
    }>;
    taxData: Array<{
      id: string;
      taxAmount: number;
      taxCategory: string;
      taxJurisdiction: string;
      taxRegistration: string;
    }>;
  };
}

interface PromptVersion {
  prompt_name: string;
  versions: string[];
}

type SubmitMode = 'overwrite_existing' | 'new_version' | 'new_template' | null;

const getNextVersion = (versions: string[]): string => {
  if (!versions.length) return 'v1';
  
  const maxVersion = versions.reduce((max, current) => {
    const match = current.match(/v(\d+)/);
    if (match) {
      const version = parseInt(match[1]);
      return version > max ? version : max;
    }
    return max;
  }, 0);
  
  return `v${maxVersion + 1}`;
};

interface FormValues {
  header: {
    region: string;
    country: string;
    vendor: string;
    invoiceNumber: string;
    vendorAddress: string;
    poNumber: string;
    taxId: string;
    shipmentNumber: string;
    receivedDate: string;
    processedDate: string;
    subtotal: string;
    tax: string;
    total: string;
    currency: string;
    issueDate: string;
    dueDate: string;
    taxPointDate: string;
    buyerDetails: string;
    buyerTaxId: string;
    buyerCompanyRegId: string;
    shipToDetails: string;
    shipToCountryCode: string;
    paymentInformation: string;
    paymentTerms: string;
    notes: string;
    exchangeRate: string;
    invoiceType: string;
    feedback: string;
    extractionMethod: string;
    processingMethod: string;
  };
  lineItems: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
    taxRate: string;
  }>;
}

const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ 
  onClose, 
  uploadedFile, 
  pdfUrl, 
  customPrompt, 
  templateName,
  selectedVersion,
  analysisResult 
}) => {
  const [activeTab, setActiveTab] = useState<'header' | 'lineItems'>('header');
  const [activeInput, setActiveInput] = useState<HTMLInputElement | null>(null);
  const [highlightedInput, setHighlightedInput] = useState<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentSelectionBox, setCurrentSelectionBox] = useState<SelectionBox | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [saveMode, setSaveMode] = useState<SubmitMode>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [hasPromptChanged, setHasPromptChanged] = useState(false);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  
  // New state variables to track current template and prompt
  const [currentTemplateName, setCurrentTemplateName] = useState(templateName || '');
  const [currentVersion, setCurrentVersion] = useState(selectedVersion || '');
  const [currentPrompt, setCurrentPrompt] = useState(customPrompt || '');
  
  const [formValues, setFormValues] = useState<FormValues>({
    header: {
      region: analysisResult?.header.region || '',
      country: analysisResult?.header.country || '',
      vendor: analysisResult?.header.vendor || '',
      invoiceNumber: analysisResult?.header.invoiceNumber || '',
      vendorAddress: analysisResult?.header.vendorAddress || '',
      poNumber: analysisResult?.header.poNumber || '',
      taxId: analysisResult?.header.taxId || '',
      shipmentNumber: analysisResult?.header.shipmentNumber || '',
      receivedDate: analysisResult?.header.receivedDate || '',
      processedDate: analysisResult?.header.processedDate || '',
      subtotal: analysisResult?.header.subtotal?.toString() || '',
      tax: analysisResult?.header.tax?.toString() || '',
      total: analysisResult?.header.total?.toString() || '',
      currency: analysisResult?.header.currency || '',
      issueDate: analysisResult?.header.issueDate || '',
      dueDate: analysisResult?.header.dueDate || '',
      taxPointDate: analysisResult?.header.taxPointDate || '',
      buyerDetails: analysisResult?.header.buyerDetails || '',
      buyerTaxId: analysisResult?.header.buyerTaxId || '',
      buyerCompanyRegId: analysisResult?.header.buyerCompanyRegId || '',
      shipToDetails: analysisResult?.header.shipToDetails || '',
      shipToCountryCode: analysisResult?.header.shipToCountryCode || '',
      paymentInformation: analysisResult?.header.paymentInformation || '',
      paymentTerms: analysisResult?.header.paymentTerms || '',
      notes: analysisResult?.header.notes || '',
      exchangeRate: analysisResult?.header.exchangeRate?.toString() || '',
      invoiceType: analysisResult?.header.invoiceType || '',
      feedback: analysisResult?.header.feedback || '',
      extractionMethod: analysisResult?.header.extractionMethod || '',
      processingMethod: analysisResult?.header.processingMethod || ''
    },
    lineItems: analysisResult?.lineItems.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toFixed(2),
      totalPrice: item.totalPrice.toFixed(2),
      taxRate: `${item.taxRate}`
    })) || []
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const pdfPageRef = useRef<any>(null);

  useEffect(() => {
    fetchPromptVersions();
  }, []);

  useEffect(() => {
    // Initialize editedPrompt with currentPrompt when opening modal
    if (showPromptModal) {
      setEditedPrompt(currentPrompt);
    }
  }, [showPromptModal]);

  const fetchPromptVersions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/invoice-management/prompt-versions`);
      if (!response.ok) {
        throw new Error('Failed to fetch prompt versions');
      }
      const data = await response.json();
      setPromptVersions(data);
    } catch (err) {
      console.error('Error fetching prompt versions:', err);
    }
  };

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true);
        let pdfData;
        
        if (uploadedFile) {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          pdfData = new Uint8Array(arrayBuffer);
        } else if (pdfUrl) {
          if (pdfUrl.startsWith('data:application/pdf;base64,')) {
            const base64Data = pdfUrl.split(',')[1];
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            pdfData = bytes;
          } else {
            const response = await fetch(pdfUrl);
            const arrayBuffer = await response.arrayBuffer();
            pdfData = new Uint8Array(arrayBuffer);
          }
        }

        if (!pdfData) {
          throw new Error('No PDF data available');
        }

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        pdfDocRef.current = await loadingTask.promise;
        setTotalPages(pdfDocRef.current.numPages);
        await renderPage();
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [uploadedFile, pdfUrl]);

  const renderPage = async () => {
    if (!pdfDocRef.current || !canvasRef.current || !containerRef.current) return;

    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      pdfPageRef.current = page;
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering PDF page:', err);
      setError('Failed to render PDF page');
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--scale-factor', scale.toString());
    }
    renderPage();
  }, [scale, rotation, currentPage]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleReload = async () => {
    setIsReloading(true);
    try {
      await renderPage();
    } catch (err) {
      console.error('Error reloading page:', err);
      setError('Failed to reload page');
    } finally {
      setIsReloading(false);
    }
  };

  const handleInputChange = (section: keyof FormValues, field: string, value: string, index?: number) => {
    setFormValues(prev => {
      if (section === 'header') {
        return {
          ...prev,
          header: {
            ...prev.header,
            [field]: value
          }
        };
      } else if (section === 'lineItems' && typeof index === 'number') {
        const newLineItems = [...prev.lineItems];
        newLineItems[index] = {
          ...newLineItems[index],
          [field]: value
        };
        return {
          ...prev,
          lineItems: newLineItems
        };
      }
      return prev;
    });
  };

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (!containerRef.current || !pdfPageRef.current || !activeInput) return;

    if (highlightedInput && highlightedInput !== activeInput) {
      highlightedInput.classList.remove('highlighted-input');
      highlightedInput.classList.remove('drawing-highlight');
      highlightedInput.classList.remove('error-highlight');
      setHighlightedInput(null);
    }

    activeInput.classList.add('drawing-highlight');

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentSelectionBox({
      startX: x,
      startY: y,
      width: 0,
      height: 0
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const currentY = e.clientY - rect.top + containerRef.current.scrollTop;

    const width = currentX - startPoint.x;
    const height = currentY - startPoint.y;

    setCurrentSelectionBox({
      startX: width > 0 ? startPoint.x : currentX,
      startY: height > 0 ? startPoint.y : currentY,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !currentSelectionBox || !pdfPageRef.current || !activeInput) return;

    try {
      const viewport = pdfPageRef.current.getViewport({ scale, rotation });
      const { width, height } = viewport;

      const selectionInPdfSpace = {
        left: (currentSelectionBox.startX / scale),
        top: (height / scale) - ((currentSelectionBox.startY + currentSelectionBox.height) / scale),
        right: ((currentSelectionBox.startX + currentSelectionBox.width) / scale),
        bottom: (height / scale) - (currentSelectionBox.startY / scale)
      };

      const textContent = await pdfPageRef.current.getTextContent();
      const selectedText = textContent.items
        .filter((item: any) => {
          const itemLeft = item.transform[4];
          const itemTop = item.transform[5];
          const itemRight = itemLeft + (item.width || 0);
          const itemBottom = itemTop + (item.height || 0);

          return (
            itemLeft >= selectionInPdfSpace.left &&
            itemRight <= selectionInPdfSpace.right &&
            itemTop >= selectionInPdfSpace.top &&
            itemBottom <= selectionInPdfSpace.bottom
          );
        })
        .map((item: any) => item.str)
        .join(' ')
        .trim();

      if (selectedText) {
        const [section, field, index] = activeInput.dataset.field?.split('.') || [];
        handleInputChange(
          section as keyof FormValues,
          field,
          selectedText,
          index ? parseInt(index) : undefined
        );
        
        activeInput.classList.remove('drawing-highlight');
        activeInput.classList.remove('error-highlight');
        activeInput.classList.add('highlighted-input');
        setHighlightedInput(activeInput);
      } else {
        activeInput.classList.remove('drawing-highlight');
        activeInput.classList.remove('highlighted-input');
        activeInput.classList.add('error-highlight');
        setHighlightedInput(activeInput);
      }
    } catch (err) {
      console.error('Error extracting text:', err);
      activeInput.classList.remove('drawing-highlight');
      activeInput.classList.remove('highlighted-input');
      activeInput.classList.add('error-highlight');
      setHighlightedInput(activeInput);
    }

    setIsDrawing(false);
    setCurrentSelectionBox(null);
    setStartPoint(null);
  };

  const handlePrint = () => {
    if (uploadedFile) {
      const fileUrl = URL.createObjectURL(uploadedFile);
      const printWindow = window.open(fileUrl);
      printWindow?.print();
      URL.revokeObjectURL(fileUrl);
    } else if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      printWindow?.print();
    }
  };

  const handleDownload = () => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = uploadedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = 'invoice.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const openInNewTab = () => {
    if (uploadedFile) {
      const url = URL.createObjectURL(uploadedFile);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleReAnalyze = async () => {
    if (!uploadedFile || !currentPrompt.trim() || isReAnalyzing) return;
    
    setIsReAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('invoice_file', uploadedFile);
      formData.append('prompt', currentPrompt);

      const response = await fetch(`${API_BASE_URL}/invoice-management/analyze-invoice`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to re-analyze invoice');
      }

      const result = await response.json();
      setFormValues({
        header: result.header || {},
        lineItems: result.lineItems || []
      });
      setHasPromptChanged(false);
    } catch (err) {
      console.error('Error re-analyzing invoice:', err);
    } finally {
      setIsReAnalyzing(false);
      setShowPromptModal(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!editedPrompt.trim() || !saveMode) return;
    
    setIsSavingPrompt(true);
    try {
      let promptName: string;
      let version: string;

      if (saveMode === 'overwrite_existing') {
        promptName = currentTemplateName;
        version = currentVersion;
      } else if (saveMode === 'new_version') {
        promptName = currentTemplateName;
        const versions = promptVersions.find(p => p.prompt_name === currentTemplateName)?.versions || [];
        version = getNextVersion(versions);
      } else { // new_template
        promptName = newTemplateName;
        version = 'v1';
      }

      const response = await fetch(`${API_BASE_URL}/invoice-management/prompt-versions/${promptName}/${version}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editedPrompt
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save prompt');
      }

      // Update current template, version and prompt
      setCurrentTemplateName(promptName);
      setCurrentVersion(version);
      setCurrentPrompt(editedPrompt);
      
      // Reset states
      setShowSaveDialog(false);
      setSaveMode(null);
      setNewTemplateName('');
      setIsEditingPrompt(false);
      setHasPromptChanged(true);

    } catch (err) {
      console.error('Error saving prompt:', err);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    
    if (highlightedInput && highlightedInput !== input) {
      highlightedInput.classList.remove('highlighted-input');
      highlightedInput.classList.remove('drawing-highlight');
      highlightedInput.classList.remove('error-highlight');
    }

    setActiveInput(input);
    input.classList.add('highlighted-input');
    setHighlightedInput(input);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'extracted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'lineItems':
        return (
          <div className="space-y-6">
            {formValues.lineItems.map((item, index) => (
              <div key={item.id} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Line Item {index + 1}</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Description</span>
                      </label>
                      <textarea
                        value={item.description}
                        data-field={`lineItems.description.${index}`}
                        onClick={(e) => setActiveInput(e.currentTarget as unknown as HTMLInputElement)}
                        onChange={(e) => handleInputChange('lineItems', 'description', e.target.value, index)}
                        rows={3}
                        className="w-full border-2 border-green-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-green-100 focus:border-green-400 transition-all duration-200 resize-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span>Quantity</span>
                        </label>
                        <input
                          type="text"
                          value={item.quantity}
                          data-field={`lineItems.quantity.${index}`}
                          onClick={handleInputClick}
                          onChange={(e) => handleInputChange('lineItems', 'quantity', e.target.value, index)}
                          className="w-full border-2 border-emerald-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                          <span>Unit Price</span>
                        </label>
                        <input
                          type="text"
                          value={`${item.unitPrice}`}
                          data-field={`lineItems.unitPrice.${index}`}
                          onClick={handleInputClick}
                          onChange={(e) => handleInputChange('lineItems', 'unitPrice', e.target.value.replace('$', ''), index)}
                          className="w-full border-2 border-teal-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-teal-100 focus:border-teal-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                          <div className="w-2 h-2 rounded-full bg-green-600"></div>
                          <span>Total Price</span>
                        </label>
                        <input
                          type="text"
                          value={`${item.totalPrice}`}
                          data-field={`lineItems.totalPrice.${index}`}
                          onClick={handleInputClick}
                          onChange={(e) => handleInputChange('lineItems', 'totalPrice', e.target.value.replace('$', ''), index)}
                          className="w-full border-2 border-green-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-green-100 focus:border-green-400 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                          <span>Tax Rate</span>
                        </label>
                        <input
                          type="text"
                          value={`${item.taxRate}%`}
                          data-field={`lineItems.taxRate.${index}`}
                          onClick={handleInputClick}
                          onChange={(e) => handleInputChange('lineItems', 'taxRate', e.target.value.replace('%', ''), index)}
                          className="w-full border-2 border-emerald-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>Region</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.region}
                      data-field="header.region"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'region', e.target.value)}
                      className="w-full border-2 border-blue-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span>Country</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.country}
                      data-field="header.country"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'country', e.target.value)}
                      className="w-full border-2 border-indigo-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>Invoice Number</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.invoiceNumber}
                      data-field="header.invoiceNumber"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'invoiceNumber', e.target.value)}
                      className="w-full border-2 border-purple-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <span>Invoice Type</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.invoiceType}
                      data-field="header.invoiceType"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'invoiceType', e.target.value)}
                      className="w-full border-2 border-blue-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                      <span>PO Number</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.poNumber}
                      data-field="header.poNumber"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'poNumber', e.target.value)}
                      className="w-full border-2 border-indigo-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                      <span>Shipment Number</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.shipmentNumber}
                      data-field="header.shipmentNumber"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'shipmentNumber', e.target.value)}
                      className="w-full border-2 border-purple-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-100 hover:border-green-200 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Vendor Information</h3>
                </div>
                
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Vendor Name</span>
                  </label>
                  <input
                    type="text"
                    value={formValues.header.vendor}
                    data-field="header.vendor"
                    onClick={handleInputClick}
                    onChange={(e) => handleInputChange('header', 'vendor', e.target.value)}
                    className="w-full border-2 border-green-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-green-100 focus:border-green-400 transition-all duration-200"
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span>Vendor Address</span>
                  </label>
                  <textarea
                    value={formValues.header.vendorAddress}
                    data-field="header.vendorAddress"
                    onClick={(e) => setActiveInput(e.currentTarget as unknown as HTMLInputElement)}
                    onChange={(e) => handleInputChange('header', 'vendorAddress', e.target.value)}
                    rows={3}
                    className="w-full border-2 border-emerald-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 resize-none"
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    <span>Tax ID</span>
                  </label>
                  <input
                    type="text"
                    value={formValues.header.taxId}
                    data-field="header.taxId"
                    onClick={handleInputClick}
                    onChange={(e) => handleInputChange('header', 'taxId', e.target.value)}
                    className="w-full border-2 border-teal-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-teal-100 focus:border-teal-400 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Buyer Information */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 border border-purple-100 hover:border-purple-200 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-violet-500"></div>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Buyer Information</h3>
                </div>
                
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span>Buyer Details</span>
                  </label>
                  <textarea
                    value={formValues.header.buyerDetails}
                    data-field="header.buyerDetails"
                    onClick={(e) => setActiveInput(e.currentTarget as unknown as HTMLInputElement)}
                    onChange={(e) => handleInputChange('header', 'buyerDetails', e.target.value)}
                    rows={3}
                    className="w-full border-2 border-purple-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all duration-200 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                      <span>Buyer Tax ID</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.buyerTaxId}
                      data-field="header.buyerTaxId"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'buyerTaxId', e.target.value)}
                      className="w-full border-2 border-violet-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-violet-100 focus:border-violet-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span>Company Reg ID</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.buyerCompanyRegId}
                      data-field="header.buyerCompanyRegId"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'buyerCompanyRegId', e.target.value)}
                      className="w-full border-2 border-indigo-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                    <span>Ship To Details</span>
                  </label>
                  <textarea
                    value={formValues.header.shipToDetails}
                    data-field="header.shipToDetails"
                    onClick={(e) => setActiveInput(e.currentTarget as unknown as HTMLInputElement)}
                    onChange={(e) => handleInputChange('header', 'shipToDetails', e.target.value)}
                    rows={3}
                    className="w-full border-2 border-purple-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all duration-200 resize-none"
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-violet-600"></div>
                    <span>Ship To Country Code</span>
                  </label>
                  <input
                    type="text"
                    value={formValues.header.shipToCountryCode}
                    data-field="header.shipToCountryCode"
                    onClick={handleInputClick}
                    onChange={(e) => handleInputChange('header', 'shipToCountryCode', e.target.value)}
                    className="w-full border-2 border-violet-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-violet-100 focus:border-violet-400 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border border-orange-100 hover:border-orange-200 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-500"></div>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                    4
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Financial Information</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span>Subtotal</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.subtotal}
                      data-field="header.subtotal"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'subtotal', e.target.value)}
                      className="w-full border-2 border-orange-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span>Tax</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.tax}
                      data-field="header.tax"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'tax', e.target.value)}
                      className="w-full border-2 border-amber-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span>Total</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.total}
                      data-field="header.total"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'total', e.target.value)}
                      className="w-full border-2 border-yellow-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                      <span>Currency</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.currency}
                      data-field="header.currency"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'currency', e.target.value)}
                      className="w-full border-2 border-orange-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-600"></div>
                      <span>Exchange Rate</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.exchangeRate}
                      data-field="header.exchangeRate"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'exchangeRate', e.target.value)}
                      className="w-full border-2 border-amber-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                    <span>Payment Terms</span>
                  </label>
                  <textarea
                    value={formValues.header.paymentTerms}
                    data-field="header.paymentTerms"
                    onClick={(e) => setActiveInput(e.currentTarget as unknown as HTMLInputElement)}
                    onChange={(e) => handleInputChange('header', 'paymentTerms', e.target.value)}
                    rows={2}
                    className="w-full border-2 border-yellow-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 transition-all duration-200 resize-none"
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-orange-700"></div>
                    <span>Payment Information</span>
                  </label>
                  <textarea
                    value={formValues.header.paymentInformation}
                    data-field="header.paymentInformation"
                    onClick={(e) => setActiveInput(e.currentTarget as unknown as HTMLInputElement)}
                    onChange={(e) => handleInputChange('header', 'paymentInformation', e.target.value)}
                    rows={2}
                    className="w-full border-2 border-orange-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-orange-100 focus:border-orange-400 transition-all duration-200 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Important Dates */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 border border-red-100 hover:border-red-200 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-pink-500"></div>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                    5
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Important Dates</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Issue Date</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.issueDate}
                      data-field="header.issueDate"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'issueDate', e.target.value)}
                      className="w-full border-2 border-red-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                      <span>Due Date</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.dueDate}
                      data-field="header.dueDate"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'dueDate', e.target.value)}
                      className="w-full border-2 border-pink-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span>Tax Point Date</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.taxPointDate}
                      data-field="header.taxPointDate"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'taxPointDate', e.target.value)}
                      className="w-full border-2 border-rose-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-rose-100 focus:border-rose-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-600"></div>
                      <span>Received Date</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.receivedDate}
                      data-field="header.receivedDate"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'receivedDate', e.target.value)}
                      className="w-full border-2 border-red-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-pink-600"></div>
                    <span>Processed Date</span>
                  </label>
                  <input
                    type="text"
                    value={formValues.header.processedDate}
                    data-field="header.processedDate"
                    onClick={handleInputClick}
                    onChange={(e) => handleInputChange('header', 'processedDate', e.target.value)}
                    className="w-full border-2 border-pink-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 border border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 to-slate-500"></div>
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-500 to-slate-600 flex items-center justify-center text-white font-bold text-sm">
                    6
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Additional Information</h3>
                </div>
                
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    <span>Notes</span>
                  </label>
                  <textarea
                    value={formValues.header.notes}
                    data-field="header.notes"
                    onClick={(e) => setActiveInput(e.currentTarget as unknown as HTMLInputElement)}
                    onChange={(e) => handleInputChange('header', 'notes', e.target.value)}
                    rows={4}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all duration-200 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                      <span>Extraction Method</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.extractionMethod}
                      data-field="header.extractionMethod"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'extractionMethod', e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
                      <span>Processing Method</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.header.processingMethod}
                      data-field="header.processingMethod"
                      onClick={handleInputClick}
                      onChange={(e) => handleInputChange('header', 'processingMethod', e.target.value)}
                      className="w-full border-2 border-zinc-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-zinc-100 focus:border-zinc-400 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                    <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                    <span>Feedback</span>
                  </label>
                  <input
                    type="text"
                    value={formValues.header.feedback}
                    data-field="header.feedback"
                    onClick={handleInputClick}
                    onChange={(e) => handleInputChange('header', 'feedback', e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl p-3 bg-white/70 backdrop-blur-sm focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 w-full max-w-7xl h-[90vh] rounded-2xl flex flex-col shadow-xl overflow-hidden">
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <button 
            onClick={onClose} 
            className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2 transition-colors"
          >
            ← Back to Analysis
          </button>
          <div className="flex items-center space-x-2">
            {currentPrompt && (
              <>
                <button
                  onClick={() => setShowPromptModal(true)}
                  className="p-2 text-purple-600 hover:text-purple-700 rounded-lg transition-colors"
                  title="View Prompt"
                >
                  <Sparkles size={20} />
                </button>
                {hasPromptChanged && (
                  <button
                    onClick={handleReAnalyze}
                    disabled={isReAnalyzing}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all duration-200 flex items-center space-x-2"
                  >
                    {isReAnalyzing ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Re-analyzing...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle size={18} />
                        <span>Re-run Analysis</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto bg-white flex flex-col">
            <div className="bg-gray-900 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={20} />
                  </button>
                  <span className="text-sm text-gray-300">{Math.round(scale * 100)}%</span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={20} />
                  </button>
                </div>
                <div className="h-6 w-px bg-gray-700" />
                <button
                  onClick={handleRotate}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Rotate"
                >
                  <RotateCw size={20} />
                </button>
                <div className="h-6 w-px bg-gray-700" />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Print"
                >
                  <Printer size={20} />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={openInNewTab}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Open in New Tab"
                >
                  <ExternalLink size={20} />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
              </div>
            </div>
            <div 
              ref={containerRef} 
              className="pdf-container flex-1"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-600">Loading PDF...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-red-600">{error}</div>
                </div>
              ) : (
                <>
                  <canvas ref={canvasRef} className="pdf-canvas" />
                  {currentSelectionBox && (
                    <div
                      className="selection-box"
                      style={{
                        left: `${currentSelectionBox.startX}px`,
                        top: `${currentSelectionBox.startY}px`,
                        width: `${currentSelectionBox.width}px`,
                        height: `${currentSelectionBox.height}px`
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div className="w-1/2 flex flex-col h-full">
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Status Box - Separate and smaller */}
              {analysisResult?.header.status && (
                <div className="mb-6">
                  <div className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium border ${getStatusColor(analysisResult.header.status)}`}>
                    <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                    Status: {analysisResult.header.status}
                  </div>
                </div>
              )}

              <div className="flex space-x-2 mb-6">
                <button
                  onClick={() => setActiveTab('header')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105 ${
                    activeTab === 'header' 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Header
                </button>
                <button
                  onClick={() => setActiveTab('lineItems')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105 ${
                    activeTab === 'lineItems' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Line Items
                </button>
              </div>

              {renderContent()}
            </div>

            <div className="p-6 border-t border-gray-200 bg-white">
              <div className="flex space-x-4">
                <button className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-blue-200 transform hover:scale-105">
                  Submit
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 bg-white text-gray-600 px-6 py-3 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium border border-gray-200 transform hover:scale-105"
                >
                  Cancel
                </button>
                <button className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-6 py-3 rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all duration-200 font-medium shadow-lg hover:shadow-teal-200 transform hover:scale-105">
                  Feedback
                </button>
              </div>
            </div>
          </div>
        </div>

        {showPromptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Analysis Prompt</h3>
                    {currentTemplateName && (
                      <p className="text-sm text-gray-600">
                        {currentTemplateName} ({currentVersion})
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!isEditingPrompt ? (
                    <button
                      onClick={() => setIsEditingPrompt(true)}
                      className="p-2 text-purple-600 hover:text-purple-700 rounded-lg transition-colors"
                      title="Edit Prompt"
                    >
                      <Pencil size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="p-2 text-purple-600 hover:text-purple-700 rounded-lg transition-colors"
                      title="Save Changes"
                    >
                      <Save size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowPromptModal(false);
                      setIsEditingPrompt(false);
                      setEditedPrompt(currentPrompt);
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="prose max-w-none">
                {isEditingPrompt ? (
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => {
                      setEditedPrompt(e.target.value);
                      setHasPromptChanged(true);
                    }}
                    className="w-full h-[60vh] bg-gray-50 p-4 rounded-lg font-mono text-sm resize-none border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter your prompt here..."
                  />
                ) : (
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[60vh]">
                    {currentPrompt}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Prompt</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose an option:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={saveMode === 'overwrite_existing'}
                        onChange={() => setSaveMode('overwrite_existing')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span>Overwrite existing version</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={saveMode === 'new_version'}
                        onChange={() => setSaveMode('new_version')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span>Create new version</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={saveMode === 'new_template'}
                        onChange={() => setSaveMode('new_template')}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span>Create new template</span>
                    </label>
                  </div>
                </div>

                {saveMode === 'new_template' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name:
                    </label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Enter template name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveMode(null);
                    setNewTemplateName('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePrompt}
                  disabled={
                    !saveMode || 
                    (saveMode === 'new_template' && !newTemplateName.trim()) || 
                    isSavingPrompt
                  }
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPrompt ? (
                    <span className="flex items-center space-x-2">
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceViewer;