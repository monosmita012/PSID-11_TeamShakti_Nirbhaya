// Photo Capture Service for automatic photo capture and Cloudinary storage
export interface PhotoCaptureService {
  startAutoCapture: (interval?: number) => Promise<void>;
  stopAutoCapture: () => Promise<string[]>;
  capturePhoto: () => Promise<string>;
  uploadPhotosToCloudinary: (photos: string[], sessionId: string) => Promise<string[]>;
}

class PhotoCaptureServiceImpl implements PhotoCaptureService {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private captureInterval: number | null = null;
  private capturedPhotos: string[] = [];
  private stream: MediaStream | null = null;

  // Initialize video and canvas elements
  private async initializeElements(): Promise<void> {
    if (this.videoElement && this.canvasElement) return;

    // Create video element (hidden)
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);

    // Create canvas element (hidden)
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.style.display = 'none';
    document.body.appendChild(this.canvasElement);
  }

  // Start camera stream
  private async startCamera(): Promise<void> {
    try {
      console.log('📷 Starting camera for photo capture...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        console.log('✅ Camera started for photo capture');
      }
    } catch (error) {
      console.error('❌ Failed to start camera for photos:', error);
      throw new Error('Camera access denied or not available');
    }
  }

  // Capture single photo
  async capturePhoto(): Promise<string> {
    try {
      await this.initializeElements();
      
      if (!this.videoElement || !this.canvasElement) {
        throw new Error('Photo capture elements not initialized');
      }

      // Start camera if not already running
      if (!this.stream) {
        await this.startCamera();
        // Wait a moment for camera to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Set canvas dimensions to match video
      this.canvasElement.width = this.videoElement.videoWidth || 1280;
      this.canvasElement.height = this.videoElement.videoHeight || 720;

      // Draw current video frame to canvas
      const ctx = this.canvasElement.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);

      // Convert to data URL
      const photoDataUrl = this.canvasElement.toDataURL('image/jpeg', 0.9);
      
      console.log('📸 Photo captured successfully');
      return photoDataUrl;

    } catch (error) {
      console.error('❌ Failed to capture photo:', error);
      throw error;
    }
  }

  // Start automatic photo capture
  async startAutoCapture(interval: number = 10000): Promise<void> {
    try {
      console.log('📷 Starting automatic photo capture every', interval, 'ms');
      
      await this.initializeElements();
      await this.startCamera();
      
      // Clear any existing interval
      if (this.captureInterval) {
        clearInterval(this.captureInterval);
      }

      // Start capturing photos at specified interval
      this.captureInterval = setInterval(async () => {
        try {
          const photo = await this.capturePhoto();
          this.capturedPhotos.push(photo);
          console.log(`📸 Auto-captured photo ${this.capturedPhotos.length}/${this.capturedPhotos.length + 1}`);
        } catch (error) {
          console.error('❌ Failed to capture auto photo:', error);
        }
      }, interval) as unknown as number;

      // Capture first photo immediately
      const firstPhoto = await this.capturePhoto();
      this.capturedPhotos.push(firstPhoto);
      
      console.log('✅ Auto photo capture started');
    } catch (error) {
      console.error('❌ Failed to start auto photo capture:', error);
      throw error;
    }
  }

  // Stop automatic photo capture and return captured photos
  async stopAutoCapture(): Promise<string[]> {
    try {
      console.log('🛑 Stopping automatic photo capture...');
      
      // Clear interval
      if (this.captureInterval) {
        clearInterval(this.captureInterval);
        this.captureInterval = null;
      }

      // Stop camera stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      // Clean up DOM elements
      if (this.videoElement) {
        document.body.removeChild(this.videoElement);
        this.videoElement = null;
      }
      if (this.canvasElement) {
        document.body.removeChild(this.canvasElement);
        this.canvasElement = null;
      }

      const photos = [...this.capturedPhotos];
      this.capturedPhotos = [];
      
      console.log(`✅ Auto photo capture stopped. Captured ${photos.length} photos`);
      return photos;
    } catch (error) {
      console.error('❌ Error stopping auto capture:', error);
      return [];
    }
  }

  // Upload photos to Cloudinary
  async uploadPhotosToCloudinary(photos: string[], sessionId: string): Promise<string[]> {
    const uploadedUrls: string[] = [];
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'your-unsigned-preset';
    const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    try {
      console.log(`☁️ Uploading ${photos.length} photos to Cloudinary...`);

      for (let i = 0; i < photos.length; i++) {
        const photoDataUrl = photos[i];
        
        // Convert data URL to blob
        const response = await fetch(photoDataUrl);
        const blob = await response.blob();
        
        // Create form data for upload
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'safety_photos');
        formData.append('public_id', `sos_${sessionId}_photo_${i + 1}_${Date.now()}`);
        formData.append('resource_type', 'image');
        formData.append('context', `session_id=${sessionId}|photo_number=${i + 1}|timestamp=${Date.now()}`);
        
        console.log(`📤 Uploading photo ${i + 1}/${photos.length}...`);
        
        const uploadResponse = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Photo upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const result = await uploadResponse.json();
        
        if (result.error) {
          throw new Error(`Cloudinary error: ${result.error.message}`);
        }

        uploadedUrls.push(result.secure_url);
        console.log(`✅ Photo ${i + 1} uploaded successfully`);
      }

      console.log(`✅ All ${photos.length} photos uploaded to Cloudinary`);
      return uploadedUrls;

    } catch (error) {
      console.error('❌ Error uploading photos to Cloudinary:', error);
      throw error;
    }
  }

  // Convert data URL to blob (utility function)
  private dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime || 'image/jpeg' });
  }

  // Cleanup resources
  cleanup(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
      this.videoElement = null;
    }
    
    if (this.canvasElement && this.canvasElement.parentNode) {
      this.canvasElement.parentNode.removeChild(this.canvasElement);
      this.canvasElement = null;
    }
    
    this.capturedPhotos = [];
  }
}

// Export singleton instance
export const photoCaptureService = new PhotoCaptureServiceImpl();
