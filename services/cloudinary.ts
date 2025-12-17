// Cloudinary Service for Media Uploads
// DIRECTIVE #1: HARDCODED CREDENTIALS

const DEFAULT_CLOUD_NAME = 'dfw0qdy0l';
const DEFAULT_PRESET = 'Urban_Kanban';

export const cloudinaryService = {
  getConfig() {
    // Priority: LocalStorage -> Hardcoded Defaults
    return {
      cloudName: localStorage.getItem('urban_cloud_name') || DEFAULT_CLOUD_NAME,
      uploadPreset: localStorage.getItem('urban_upload_preset') || DEFAULT_PRESET
    };
  },

  setConfig(cloudName: string, uploadPreset: string) {
    localStorage.setItem('urban_cloud_name', cloudName);
    localStorage.setItem('urban_upload_preset', uploadPreset);
  },

  isConfigured() {
    const { cloudName, uploadPreset } = this.getConfig();
    return !!cloudName && !!uploadPreset;
  },

  // Проверка настроек
  async testConnection(cloudName: string, uploadPreset: string): Promise<boolean> {
    const effectiveCloud = cloudName || DEFAULT_CLOUD_NAME;
    const effectivePreset = uploadPreset || DEFAULT_PRESET;

    // 1x1 Transparent GIF base64
    const pixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    
    const formData = new FormData();
    formData.append('file', pixel);
    formData.append('upload_preset', effectivePreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${effectiveCloud}/upload`, {
        method: 'POST',
        body: formData
      });
      return response.ok;
    } catch (error) {
      console.error("Cloudinary test failed:", error);
      return false;
    }
  },

  async uploadFile(file: File): Promise<string> {
    const { cloudName, uploadPreset } = this.getConfig();

    // Should not happen with hardcoded defaults
    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary not configured");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  }
};