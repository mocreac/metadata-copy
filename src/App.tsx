import { useState } from 'react';
import { PDFDocument, PDFDict, PDFName, PDFString } from 'pdf-lib';

type Metadata = {
  [key: string]: any;
};

const MetadataDisplay = ({ metadata }: { metadata: Metadata | null }) => {
  if (!metadata) {
    return (
      <div className="mt-4 text-center text-apple-gray-500">
        Upload a file to see its metadata.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="flex justify-between text-sm">
          <span className="font-medium text-apple-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
          <span className="text-apple-gray-900 text-right">{value instanceof Date ? value.toLocaleString() : value.toString()}</span>
        </div>
      ))}
    </div>
  );
};

const FileInput = ({ id, onChange }: { id: string, onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="flex items-center justify-center w-full">
    <label htmlFor={id} className="flex flex-col items-center justify-center w-full h-64 border-2 border-apple-gray-300 border-dashed rounded-xl cursor-pointer bg-apple-gray-100 hover:bg-apple-gray-200">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-10 h-10 mb-3 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <p className="mb-2 text-sm text-apple-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-apple-gray-500">File</p>
        </div>
        <input id={id} type="file" className="hidden" onChange={onChange} />
    </label>
  </div>
);


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
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const infoDictRef = pdfDoc.context.trailer.get(PDFName.of('Info'));
    const metadata: Metadata = {};
    if (infoDictRef) {
      const infoDict = pdfDoc.context.lookup(infoDictRef) as PDFDict;
      if (infoDict) {
        infoDict.entries().forEach(([key, value]) => {
          metadata[key.decodeText()] = value.toString();
        });
      }
    }

    setMetadata(metadata);
    setModifiedFile(null);
  };

  const handleTranslate = async () => {
    if (!sourceFile || !targetFile || !sourceMetadata) {
      alert('Please upload both source and target files.');
      return;
    }

    const targetArrayBuffer = await targetFile.arrayBuffer();
    const targetPdfDoc = await PDFDocument.load(targetArrayBuffer);

    Object.entries(sourceMetadata).forEach(([key, value]) => {
      if (key === 'CreationDate') {
        targetPdfDoc.setCreationDate(new Date(value));
      } else if (key === 'ModDate') {
        targetPdfDoc.setModificationDate(new Date(value));
      } else if (key === 'Title') {
        targetPdfDoc.setTitle(value);
      } else if (key === 'Author') {
        targetPdfDoc.setAuthor(value);
      } else if (key === 'Subject') {
        targetPdfDoc.setSubject(value);
      } else if (key === 'Keywords') {
        targetPdfDoc.setKeywords(value);
      } else if (key === 'Creator') {
        targetPdfDoc.setCreator(value);
      } else if (key === 'Producer') {
        targetPdfDoc.setProducer(value);
      } else {
        const infoDict = targetPdfDoc.getInfoDict();
        infoDict.set(PDFName.of(key), PDFString.of(value));
      }
    });
    
    const infoDict = targetPdfDoc.context.lookup(targetPdfDoc.context.trailer.get(PDFName.of('Info'))) as PDFDict;
    const newTargetMetadata: Metadata = {};
    if (infoDict) {
      infoDict.entries().forEach(([key, value]) => {
        newTargetMetadata[key.decodeText()] = value.toString();
      });
    }
    setTargetMetadata(newTargetMetadata);

    const fileBytes = await targetPdfDoc.save();
    setModifiedFile(fileBytes);
  };

  const handleDownload = () => {
    if (!modifiedFile) {
      return;
    }

    const blob = new Blob([modifiedFile], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'translated-metadata.dat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-apple-gray-100 min-h-screen font-sans text-apple-gray-900">
      <header className="py-20">
        <h1 className="text-5xl font-bold tracking-tight text-center">
          Metadata Translator
        </h1>
        <p className="mt-3 text-lg text-apple-gray-500 text-center max-w-2xl mx-auto">
          Upload a source file and a target file, and the metadata from the source will be copied to the target.
        </p>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Source File */}
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Source File</h2>
            <FileInput id="source-file-upload" onChange={(e) => handleFileChange(e, setSourceMetadata, setSourceFile)} />
            <MetadataDisplay metadata={sourceMetadata} />
          </div>

          {/* Target File */}
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Target File</h2>
            <FileInput id="target-file-upload" onChange={(e) => handleFileChange(e, setTargetMetadata, setTargetFile)} />
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
              Download Modified File
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
