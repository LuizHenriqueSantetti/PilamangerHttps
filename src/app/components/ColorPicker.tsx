import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  isDark?: boolean;
  label?: string;
}

export function ColorPicker({ color, onChange, isDark = false, label }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [hexInput, setHexInput] = useState(color);
  const [favorites, setFavorites] = useState<string[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const textPrimary = isDark ? '#F8FAFC' : '#1F2937';
  const textSecondary = isDark ? '#E2E8F0' : '#374151';
  const card = isDark ? '#1F2937' : '#ffffff';
  const border = isDark ? '#334155' : '#E5E7EB';

  // Carregar cores favoritas do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favoriteColors');
    if (saved) {
      setFavorites(JSON.parse(saved));
    } else {
      // Cores padrão do sistema
      setFavorites(['#087F8C', '#4CAF88', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']);
    }
  }, []);

  // Atualizar hexInput quando color mudar externamente
  useEffect(() => {
    setHexInput(color);
  }, [color]);

  // Fechar picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);

    // Validar e aplicar cor se for válida
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
    }
  };

  const handleHexBlur = () => {
    // Se não for válido, reverter para a cor anterior
    if (!/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      setHexInput(color);
    }
  };

  const handleColorClick = () => {
    inputRef.current?.click();
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toUpperCase();
    setHexInput(newColor);
    onChange(newColor);
  };

  const addToFavorites = () => {
    if (!favorites.includes(color)) {
      const newFavorites = [...favorites, color];
      setFavorites(newFavorites);
      localStorage.setItem('favoriteColors', JSON.stringify(newFavorites));
    }
  };

  const removeFavorite = (colorToRemove: string) => {
    const newFavorites = favorites.filter(c => c !== colorToRemove);
    setFavorites(newFavorites);
    localStorage.setItem('favoriteColors', JSON.stringify(newFavorites));
  };

  return (
    <div className="relative" ref={pickerRef}>
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: textSecondary }}>
          {label}
        </label>
      )}

      <div className="flex gap-3 items-center">
        {/* Preview e seletor de cor */}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:shadow-md"
          style={{
            backgroundColor: isDark ? '#111827' : '#F8FAFC',
            borderColor: border
          }}
        >
          <div
            className="w-8 h-8 rounded-lg border-2 cursor-pointer transition-transform hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor: isDark ? '#ffffff40' : '#00000020'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleColorClick();
            }}
          />
          <span className="text-sm font-mono" style={{ color: textPrimary }}>
            {hexInput.toUpperCase()}
          </span>
        </button>

        {/* Input nativo escondido para seleção de cor */}
        <input
          ref={inputRef}
          type="color"
          value={color}
          onChange={handleNativeColorChange}
          className="sr-only"
        />
      </div>

      {/* Picker expandido */}
      {showPicker && (
        <div
          className="absolute z-50 mt-2 rounded-xl shadow-2xl p-4 border"
          style={{
            backgroundColor: card,
            borderColor: border,
            minWidth: '280px'
          }}
        >
          {/* Campo HEX editável */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2" style={{ color: textSecondary }}>
              Código HEX
            </label>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              onBlur={handleHexBlur}
              maxLength={7}
              placeholder="#000000"
              className="w-full px-3 py-2 rounded-lg border font-mono text-sm"
              style={{
                backgroundColor: isDark ? '#111827' : '#F8FAFC',
                borderColor: border,
                color: textPrimary
              }}
            />
          </div>

          {/* Seletor de cor visual */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2" style={{ color: textSecondary }}>
              Selecionar Cor
            </label>
            <div
              className="w-full h-32 rounded-lg border-2 cursor-pointer overflow-hidden"
              style={{ borderColor: border }}
              onClick={handleColorClick}
            >
              <div className="w-full h-full relative">
                <input
                  type="color"
                  value={color}
                  onChange={handleNativeColorChange}
                  className="w-full h-full cursor-pointer"
                  style={{
                    border: 'none',
                    padding: 0,
                    margin: 0
                  }}
                />
              </div>
            </div>
          </div>

          {/* Cores favoritas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: textSecondary }}>
                Cores Favoritas
              </label>
              <button
                type="button"
                onClick={addToFavorites}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{
                  color: '#087F8C',
                  backgroundColor: isDark ? '#1B565020' : '#D6ECEB'
                }}
              >
                + Adicionar Atual
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {favorites.map((favColor, index) => (
                <div key={index} className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      setHexInput(favColor);
                      onChange(favColor);
                    }}
                    className="w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 relative"
                    style={{
                      backgroundColor: favColor,
                      borderColor: favColor === color ? '#087F8C' : isDark ? '#ffffff20' : '#00000020'
                    }}
                  >
                    {favColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFavorite(favColor)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ fontSize: '10px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
