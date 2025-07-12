// File type definitions and supported formats

export const FILE_TYPES = {
  PDF: 'pdf',
  IMAGE: 'image',
  TEXT: 'text',
  DOCUMENT: 'document',
  VIDEO: 'video',
  AUDIO: 'audio',
  ARCHIVE: 'archive'
};

export const SUPPORTED_FORMATS = {
  [FILE_TYPES.PDF]: {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    icon: '📄',
    description: 'PDF Documents'
  },
  [FILE_TYPES.IMAGE]: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'],
    mimeTypes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/bmp', 'image/webp', 'image/tiff', 'image/svg+xml'
    ],
    icon: '🖼️',
    description: 'Images'
  },
  [FILE_TYPES.TEXT]: {
    extensions: ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.rtf'],
    mimeTypes: [
      'text/plain', 'text/markdown', 'application/json', 
      'text/xml', 'text/csv', 'text/rtf'
    ],
    icon: '📝',
    description: 'Text Files'
  },
  [FILE_TYPES.DOCUMENT]: {
    extensions: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'],
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation'
    ],
    icon: '📊',
    description: 'Office Documents'
  },
  [FILE_TYPES.VIDEO]: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
    mimeTypes: [
      'video/mp4', 'video/avi', 'video/quicktime', 
      'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/x-matroska'
    ],
    icon: '🎥',
    description: 'Videos'
  },
  [FILE_TYPES.AUDIO]: {
    extensions: ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a'],
    mimeTypes: [
      'audio/mpeg', 'audio/wav', 'audio/aac', 
      'audio/ogg', 'audio/flac', 'audio/mp4'
    ],
    icon: '🎵',
    description: 'Audio Files'
  },
  [FILE_TYPES.ARCHIVE]: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimeTypes: [
      'application/zip', 'application/x-rar-compressed',
      'application/x-7z-compressed', 'application/x-tar', 'application/gzip'
    ],
    icon: '🗜️',
    description: 'Archives'
  }
};

export function detectFileType(file) {
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  for (const [type, config] of Object.entries(SUPPORTED_FORMATS)) {
    if (config.extensions.includes(extension) || config.mimeTypes.includes(mimeType)) {
      return type;
    }
  }
  
  return null;
}

export function isFileSupported(file) {
  return detectFileType(file) !== null;
}

export function getFileTypeInfo(fileType) {
  return SUPPORTED_FORMATS[fileType] || null;
}

export function getAllSupportedExtensions() {
  return Object.values(SUPPORTED_FORMATS)
    .flatMap(format => format.extensions)
    .join(',');
}

export function getAllSupportedMimeTypes() {
  return Object.values(SUPPORTED_FORMATS)
    .flatMap(format => format.mimeTypes);
}