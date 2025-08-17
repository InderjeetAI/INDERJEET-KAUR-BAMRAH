
export interface SensitiveInfo {
  type: string;
  text: string;
}

export interface TextItemWithCoords {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedItem extends TextItemWithCoords {
  id: string;
  type: string;
}

export interface ProcessingState {
  status: 'idle' | 'parsing' | 'analyzing' | 'done' | 'error';
  message: string;
}
