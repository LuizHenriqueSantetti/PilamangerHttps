import { useState, useRef } from 'react';
import { Upload, X, Camera } from 'lucide-react';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (imageBase64: string) => void;
  label?: string;
  isDark?: boolean;
}

export function ImageUpload({ currentImage, onImageChange, label = 'Foto', isDark = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido');
        return;
      }

      // Verificar tamanho (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB');
        return;
      }

      // Converter para base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        onImageChange(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreview(undefined);
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const border = isDark ? '#2a2a2f' : '#E5E7EB';
  const bg = isDark ? '#111827' : '#F8FAFC';

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-semibold" style={{ color: '#087F8C' }}>
        {label}
      </label>

      <div className="flex items-center gap-4">
        {/* Preview da imagem */}
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border-2"
              style={{ borderColor: '#087F8C' }}
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className="w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: border, backgroundColor: bg }}
          >
            <Camera className="w-8 h-8" style={{ color: '#087F8C', opacity: 0.5 }} />
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleButtonClick}
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: '#087F8C', color: '#087F8C' }}
          >
            <Upload className="w-4 h-4" />
            Selecionar Foto
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-xs" style={{ color: isDark ? '#94A3B8' : '#6B7280' }}>
            Máximo 2MB (JPG, PNG)
          </p>
        </div>
      </div>
    </div>
  );
}
