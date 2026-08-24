import React, { useEffect, useRef } from 'react';
import { renderBarcode, BarcodeRenderOptions } from '../../lib/barcode';

interface BarcodeProps {
  value: string;
  className?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  background?: string;
  lineColor?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  className = '',
  width = 2,
  height = 50,
  displayValue = true,
  fontSize = 14,
  background = 'transparent',
  lineColor = '#000000',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      const opts: BarcodeRenderOptions = {
        width,
        height,
        displayValue,
        fontSize,
        background,
        lineColor,
        font: 'JetBrains Mono, monospace',
        textMargin: 3,
        margin: 4,
      };
      renderBarcode(svgRef.current, value, opts);
    }
  }, [value, width, height, displayValue, fontSize, background, lineColor]);

  if (!value) return null;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto overflow-visible" />
    </div>
  );
};
