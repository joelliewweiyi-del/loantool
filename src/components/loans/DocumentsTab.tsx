import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLoanDocuments, useUploadDocument, useDeleteDocument, downloadDocument } from '@/hooks/useDocuments';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Trash2, Download, FileText } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentsTabProps {
  loanId: string;
}

export function DocumentsTab({ loanId }: DocumentsTabProps) {
  const { data: documents, isLoading } = useLoanDocuments(loanId);
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadDoc.mutateAsync({ loanId, file });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  const handleDelete = async (doc: typeof documents extends (infer T)[] ? T : never) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    await deleteDoc.mutateAsync({ doc });
  };

  return (
    <Card className={isMobile ? 'border-0 shadow-none bg-transparent' : ''}>
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
            No documents uploaded yet
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
                    </div>
                  </td>
                  <td className="font-mono text-sm">{formatFileSize(doc.file_size)}</td>
                  <td className="font-mono text-sm">{formatDate(doc.created_at)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
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
