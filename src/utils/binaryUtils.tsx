// src/utils/binaryUtils.ts

/**
 * Detects if binary data is a PDF based on its signature
 * @param binaryData - The binary data as a string
 * @returns boolean
 */
export const isPdf = (binaryData: string): boolean => {
  return binaryData.includes('%PDF');
};

/**
 * Converts Python-style binary string to a PDF URL
 * @param binaryString - Python-style binary string (starts with b')
 * @returns Promise resolving to a URL string
 */
export const convertPythonBinaryToPdfUrl = async (binaryString: string): Promise<string> => {
  // Remove the b' prefix and ' suffix if present
  let cleanData = binaryString;
  if (binaryString.startsWith("b'") && binaryString.endsWith("'")) {
    cleanData = binaryString.substring(2, binaryString.length - 1);
  } else if (binaryString.startsWith('b"') && binaryString.endsWith('"')) {
    cleanData = binaryString.substring(2, binaryString.length - 1);
  }
  
  // Unescape Python escape sequences
  cleanData = cleanData.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  }).replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n');
  
  // Create a Blob from the binary data
  const blob = new Blob([cleanData], { type: 'application/pdf' });
  
  // Create and return URL
  return URL.createObjectURL(blob);
};

/**
 * Converts an image URL to a PDF URL
 * @param imageUrl - The image URL
 * @returns Promise resolving to a PDF URL string
 */
export const convertImageToPdf = async (imageUrl: string): Promise<string> => {
  // Dynamically import jsPDF to improve initial load performance
  const { default: jsPDF } = await import('jspdf');
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      try {
        // Calculate dimensions to maintain aspect ratio
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height]
        });
        
        // Add image to PDF
        pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
        
        // Generate PDF blob and create URL
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        resolve(pdfUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image from URL: ${imageUrl}`));
    };
  });
};

/**
 * Checks if a string is a Python-style binary data
 * @param str - The string to check
 * @returns boolean
 */
export const isPythonBinaryData = (str: string): boolean => {
  return typeof str === 'string' && 
         (str.startsWith("b'") || str.startsWith('b"')) && 
         (str.includes("%PDF") || str.includes("\\x"));
};

/**
 * Checks if a URL is an image by its extension
 * @param url - The URL to check
 * @returns boolean
 */
export const isImageUrl = (url: string): boolean => {
  return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url);
};
