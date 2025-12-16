// Cloudinary Service for Media Uploads

export const cloudinaryService = {
  getConfig() {
    return {
      cloudName: localStorage.getItem('urban_cloud_name') || '',
      uploadPreset: localStorage.getItem('urban_upload_preset') || ''
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

  async uploadFile(file: File): Promise<string> {
    const { cloudName, uploadPreset } = this.getConfig();

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary not configured");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    // Optional: add folder
    // formData.append('folder', 'urban_kanban');

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
      return data.secure_url; // Returns the HTTPs URL
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  }
};