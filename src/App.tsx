import { useState } from 'react';

type Metadata = {
  [key: string]: any;
};

const MetadataDisplay = ({ metadata }: { metadata: Metadata | null }) => {
  if (!metadata) {
    return (
      <div className="mt-4 text-center text-apple-gray-500">
        Upload a PDF file to see its metadata.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="flex justify-between text-sm">
          <span className="font-medium text-apple-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
          <span className="text-apple-gray-900 text-left break-all whitespace-normal">{value instanceof Date ? value.toLocaleString() : value.toString()}</span>
        </div>
      ))}
    </div>
  );
};

const FileInput = ({ id, onChange, file, onRemove }: { id: string, onChange: (event: React.ChangeEvent<HTMLInputElement>) => void, file: File | null, onRemove: () => void }) => {
  if (file) {
    return (
      <div className="flex items-center justify-between w-full h-64 border-2 border-apple-gray-300 border-dashed rounded-xl p-6">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-apple-gray-900">{file.name}</span>
          <span className="text-xs text-apple-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
        </div>
        <button
          onClick={onRemove}
          className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full">
      <label htmlFor={id} className="flex flex-col items-center justify-center w-full h-64 border-2 border-apple-gray-300 border-dashed rounded-xl cursor-pointer bg-apple-gray-100 hover:bg-apple-gray-200">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <p className="mb-2 text-sm text-apple-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-apple-gray-500">PDF</p>
          </div>
          <input id={id} type="file" className="hidden" onChange={onChange} accept=".pdf" />
      </label>
    </div>
  );
};


function App() {
  const [sourceMetadata, setSourceMetadata] = useState<Metadata | null>(null);
  const [targetMetadata, setTargetMetadata] = useState<Metadata | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [modifiedFile, setModifiedFile] = useState<Uint8Array | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setMetadata: React.Dispatch<React.SetStateAction<Metadata | null>>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFile(file);
    const arrayBuffer = await file.arrayBuffer();
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const metadata: Metadata = {};
      
      // @ts-expect-error - getInfoDict is private
      const infoDict = pdfDoc.getInfoDict();
      if (infoDict) {
        // @ts-expect-error - dict is private
        infoDict.dict.entries().forEach(([key, value]) => {
          metadata[key.decodeText()] = value.toString();
        });
      }

      setMetadata(metadata);
      setModifiedFile(null);
    } catch (error) {
      console.error('Failed to load or parse PDF:', error);
      alert('Failed to load or parse PDF. Please make sure it is a valid PDF file.');
    }
  };

  const handleRemove = (
    setMetadata: React.Dispatch<React.SetStateAction<Metadata | null>>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    setMetadata(null);
    setFile(null);
  };

  const handleTranslate = async () => {
    if (!sourceFile || !targetFile || !sourceMetadata) {
      alert('Please upload both source and target PDF files.');
      return;
    }

    const targetArrayBuffer = await targetFile.arrayBuffer();
    try {
      const { PDFDocument, PDFName, PDFString } = await import('pdf-lib');
      const targetPdfDoc = await PDFDocument.load(targetArrayBuffer);

      Object.entries(sourceMetadata).forEach(([key, value]) => {
        // @ts-expect-error - getInfoDict is private
        const infoDict = targetPdfDoc.getInfoDict();
        infoDict.set(PDFName.of(key), PDFString.of(value));
      });
      
      const newTargetMetadata: Metadata = {};
      // @ts-expect-error - getInfoDict is private
      const infoDict = targetPdfDoc.getInfoDict();
      if (infoDict) {
        // @ts-expect-error - dict is private
        infoDict.dict.entries().forEach(([key, value]) => {
          newTargetMetadata[key.decodeText()] = value.toString();
        });
      }
      setTargetMetadata(newTargetMetadata);

      const fileBytes = await targetPdfDoc.save();
      setModifiedFile(fileBytes);
    } catch (error) {
      console.error('Failed to translate metadata:', error);
      alert('Failed to translate metadata.');
    }
  };

  const handleDownload = () => {
    if (!modifiedFile) {
      return;
    }

    const blob = new Blob([new Uint8Array(modifiedFile)], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'translated-metadata.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-apple-gray-100 min-h-screen font-sans text-apple-gray-900">
      <header className="py-20">
        <h1 className="text-5xl font-bold tracking-tight text-center">
          PDF Metadata Translator
        </h1>
        <p className="mt-3 text-lg text-apple-gray-500 text-center max-w-2xl mx-auto">
          Upload a source PDF and a target PDF, and all metadata from the source will be copied to the target.
        </p>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Source PDF */}
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Source PDF</h2>
            <FileInput 
              id="source-file-upload" 
              file={sourceFile}
              onChange={(e) => handleFileChange(e, setSourceMetadata, setSourceFile)}
              onRemove={() => handleRemove(setSourceMetadata, setSourceFile)}
            />
            <MetadataDisplay metadata={sourceMetadata} />
          </div>

          {/* Target PDF */}
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Target PDF</h2>
            <FileInput 
              id="target-file-upload"
              file={targetFile}
              onChange={(e) => handleFileChange(e, setTargetMetadata, setTargetFile)}
              onRemove={() => handleRemove(setTargetMetadata, setTargetFile)}
            />
            <MetadataDisplay metadata={targetMetadata} />
          </div>
        </div>
        <div className="mt-12 flex justify-center space-x-4">
          <button
            onClick={handleTranslate}
            className="px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-apple-gray-300 transition-colors"
            disabled={!sourceFile || !targetFile}
          >
            Translate Metadata
          </button>
          {modifiedFile && (
            <button
              onClick={handleDownload}
              className="px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              Download Modified PDF
            </button>
          )}
        </div>
      </main>
      <footer className="py-12 text-center text-apple-gray-500">
        <p>All processing is done client-side. No data is ever stored.</p>
      </footer>
    </div>
  );
}

export default App;
