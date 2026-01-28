self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  try {
    if (type === 'parse') {
      let jsonString: string;
      
      if (typeof payload === 'string') {
        jsonString = payload;
      } else if (payload instanceof Uint8Array) {
        const decoder = new TextDecoder('utf-8');
        jsonString = decoder.decode(payload);
      } else {
        throw new Error('Unsupported payload type');
      }

      const result = JSON.parse(jsonString);
      self.postMessage({ type: 'success', payload: result });
    }
  } catch (err: any) {
    self.postMessage({ type: 'error', error: err.message });
  }
};
