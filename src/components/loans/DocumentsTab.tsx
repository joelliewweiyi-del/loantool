import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLoanDocuments, useUploadDocument, useDeleteDocument, downloadDocument } from '@/hooks/useDocuments';
import { useTranslateDocument, hasTranslation, isTranslationFile } from '@/hooks/useTranslateDocument';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Trash2, Download, FileText, Globe, Loader2, Eye } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(doc: { file_name: string; content_type: string | null }): boolean {
  return doc.file_name.toLowerCase().endsWith('.pdf') || doc.content_type === 'application/pdf';
}

interface DocumentsTabProps {
  loanId: string;
}

export function DocumentsTab({ loanId }: DocumentsTabProps) {
  const { data: documents, isLoading } = useLoanDocuments(loanId);
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const translateDoc = useTranslateDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [uploading, setUploading] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadDoc.mutateAsync({ loanId, file });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const blob = await downloadDocument(filePath);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewHtml = async (filePath: string) => {
    const blob = await downloadDocument(filePath);
    const html = await blob.text();
    const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  };

  const handleTranslate = async (doc: typeof documents extends (infer T)[] ? T : never) => {
    setTranslatingId(doc.id);
    try {
      await translateDoc.mutateAsync(doc);
    } finally {
      setTranslatingId(null);
    }
  };

  const handleDelete = async (doc: typeof documents extends (infer T)[] ? T : never) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    await deleteDoc.mutateAsync({ doc });
  };

  const allDocs = documents || [];
  const isTranslating = translatingId !== null;

  return (
    <Card
      className={`${isMobile ? 'border-0 shadow-none bg-transparent' : ''} relative`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Drop files to upload</span>
          </div>
        </div>
      )}
      <CardHeader className={isMobile ? 'px-0 pt-0 pb-3' : 'flex flex-row items-center justify-between'}>
        {!isMobile && (
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Loan documentation files</CardDescription>
          </div>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? 'px-0' : ''}>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : !documents || documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No documents uploaded yet — drag files here or click Upload
          </div>
        ) : isMobile ? (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-foreground-muted">
                    {formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}
                  </p>
                </div>
                {/* View button for translation HTML files */}
                {isTranslationFile(doc) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => handleViewHtml(doc.file_path)}
                    title="View translation"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {/* Translate button for PDFs that don't have a translation yet */}
                {isPdf(doc) && !hasTranslation(doc, allDocs) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => handleTranslate(doc)}
                    disabled={isTranslating}
                    title="Translate to English"
                  >
                    {translatingId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {/* View Translation button for PDFs that already have a translation */}
                {isPdf(doc) && hasTranslation(doc, allDocs) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0 text-accent-sage"
                    onClick={() => {
                      const enDoc = allDocs.find(d => d.file_name === doc.file_name.replace(/\.pdf$/i, '-EN.html'));
                      if (enDoc) handleViewHtml(enDoc.file_path);
                    }}
                    title="View English translation"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => handleDownload(doc.file_path, doc.file_name)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 text-destructive"
                  onClick={() => handleDelete(doc)}
                  disabled={deleteDoc.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate max-w-[300px]">{doc.file_name}</span>
                      {isTranslationFile(doc) && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-sage/10 text-accent-sage">EN</span>
                      )}
                    </div>
                  </td>
                  <td className="font-mono text-sm">{formatFileSize(doc.file_size)}</td>
                  <td className="font-mono text-sm">{formatDate(doc.created_at)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View button for translation HTML files */}
                      {isTranslationFile(doc) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHtml(doc.file_path)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                      {/* Translate button for PDFs without a translation */}
                      {isPdf(doc) && !hasTranslation(doc, allDocs) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTranslate(doc)}
                          disabled={isTranslating}
                        >
                          {translatingId === doc.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Globe className="h-4 w-4 mr-1" />
                          )}
                          {translatingId === doc.id ? 'Translating...' : 'Translate'}
                        </Button>
                      )}
                      {/* View Translation for PDFs that have one */}
                      {isPdf(doc) && hasTranslation(doc, allDocs) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-accent-sage"
                          onClick={() => {
                            const enDoc = allDocs.find(d => d.file_name === doc.file_name.replace(/\.pdf$/i, '-EN.html'));
                            if (enDoc) handleViewHtml(enDoc.file_path);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View EN
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc.file_path, doc.file_name)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(doc)}
                        disabled={deleteDoc.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
