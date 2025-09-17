import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { UploadIcon } from './icons/UploadIcon';
import { XIcon } from './icons/XIcon';
import { MAX_TEXT_LENGTH } from '../constants';

interface ContractInputProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFileSelect: (fileContent: string) => void;
  onDecode: () => void;
  isLoading: boolean;
  onError: (message: string) => void;
  onClear: () => void;
}

export const ContractInput: React.FC<ContractInputProps> = ({ value, onChange, onFileSelect, onDecode, isLoading, onError, onClear }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isReadingFile, setIsReadingFile] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size before reading into memory to prevent performance issues.
      if (file.size > MAX_TEXT_LENGTH) {
        onError(`File is too large. Please select a file smaller than ${MAX_TEXT_LENGTH / 1000}KB.`);
        if (event.target) {
            event.target.value = '';
        }
        return;
      }

      setIsReadingFile(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onFileSelect(text);
        setIsReadingFile(false);
      };
      reader.onerror = () => {
        setIsReadingFile(false);
        onError("There was an error reading the file.");
        console.error("Error reading file.");
      };
      reader.readAsText(file);
    }
    // Reset file input to allow selecting the same file again
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    // To ensure consistency with file uploads, reject oversized text instead of truncating.
    // This prevents potential data loss and analysis of incomplete documents.
    if (newValue.length > MAX_TEXT_LENGTH) {
        // By not calling onChange, the controlled component will revert to its previous state,
        // effectively "blocking" the oversized paste.
        onError(`Pasted text is too long (${(newValue.length / 1000).toFixed(1)}KB) and was rejected. Please paste text smaller than ${MAX_TEXT_LENGTH / 1000}KB.`);
    } else {
        // Only propagate the change if it's within the valid size limit.
        onChange(event);
    }
  };
  
  const hasValue = value.trim().length > 0;
  const isDisabled = isLoading || isReadingFile;

  return (
    <div className="bg-white/10 border border-white/20 rounded-2xl shadow-xl shadow-glass p-6 backdrop-blur-xl relative">
      <label htmlFor="contract-input" className="sr-only">Paste your contract, terms of service, or policy text here...</label>
      {hasValue && !isDisabled && (
        <button 
            onClick={onClear} 
            aria-label="Clear input"
            className="absolute top-8 right-8 z-10 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-muted-foreground hover:text-foreground transition-colors"
        >
            <XIcon className="w-4 h-4" />
        </button>
      )}
      <textarea
        id="contract-input"
        value={value}
        onChange={handleInputChange}
        placeholder="Paste your contract, terms of service, or policy text here, or upload a file..."
        className="w-full h-64 p-4 bg-white/20 border border-white/30 rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 resize-none shadow-glass"
        disabled={isDisabled}
      />
      <div className="mt-6 flex justify-between items-center">
        <div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="text/*"
            />
            <button
                onClick={handleUploadClick}
                disabled={isDisabled}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors bg-white/20 text-secondary-foreground hover:bg-white/40 disabled:opacity-50 border border-white/20"
            >
                <UploadIcon className="h-4 w-4" />
                {isReadingFile ? 'Reading...' : 'Upload File'}
            </button>
        </div>

        <button
          onClick={onDecode}
          disabled={isDisabled || !hasValue}
          className={`group relative inline-flex items-center justify-center px-8 py-3 h-12 overflow-hidden rounded-full font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-fuchsia-500 shadow-lg shadow-primary/30 ${hasValue && !isLoading ? 'animate-pulse-slow' : ''}`}
        >
          <span className="absolute h-0 w-0 rounded-full bg-purple-700 transition-all duration-500 ease-out group-hover:h-56 group-hover:w-56"></span>
          <span className="relative flex items-center gap-2">
            {isLoading ? 'Analyzing...' : 'Analyze Text'}
            {!isLoading && <SparklesIcon className="h-5 w-5" />}
          </span>
        </button>
      </div>
    </div>
  );
};
