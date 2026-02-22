// Cloudinary Video Service for SOS recordings
export interface CloudinaryVideoService {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  uploadToCloudinary: (videoBlob: Blob, sessionId: string) => Promise<string>;
}

// Cloudinary configuration
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'your-unsigned-preset';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

class CloudinaryVideoServiceImpl implements CloudinaryVideoService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  // Start recording video with audio
  async startRecording(): Promise<void> {
    try {
      console.log('🎥 Starting video recording with audio...');
      
      // Request camera and microphone permissions
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Initialize MediaRecorder
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      // Collect data chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Start recording
      this.mediaRecorder.start();
      console.log('✅ Video recording started successfully');

    } catch (error) {
      console.error('❌ Failed to start video recording:', error);
      throw new Error('Camera/Microphone access denied or not available');
    }
  }

  // Stop recording and return video blob
  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording found'));
        return;
      }

      console.log('🛑 Stopping video recording...');

      this.mediaRecorder.onstop = () => {
        try {
          // Create blob from recorded chunks
          const videoBlob = new Blob(this.recordedChunks, {
            type: 'video/webm;codecs=vp8,opus'
          });

          // Stop all tracks
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
          }

          // Create object URL for preview
          const videoUrl = URL.createObjectURL(videoBlob);
          
          console.log('✅ Video recording stopped');
          console.log('📹 Video blob size:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');
          
          resolve(videoUrl);
        } catch (error) {
          console.error('❌ Error processing video:', error);
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  // Upload video to Cloudinary
  async uploadToCloudinary(videoBlob: Blob, sessionId: string): Promise<string> {
    try {
      console.log('☁️ Uploading video to Cloudinary...');
      
      // Validate configuration
      if (CLOUD_NAME === 'your-cloud-name' || UPLOAD_PRESET === 'your-unsigned-preset') {
        throw new Error('Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env.local');
      }
      
      // Validate video blob
      if (!videoBlob || videoBlob.size === 0) {
        throw new Error('Invalid video blob: empty or null');
      }
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', videoBlob);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'safety_videos');
      formData.append('public_id', `sos_${sessionId}_${Date.now()}`);
      formData.append('resource_type', 'video');
      
      // Add metadata
      formData.append('context', `session_id=${sessionId}|timestamp=${Date.now()}`);
      
      console.log('📤 Sending upload request to:', CLOUDINARY_URL);
      console.log('📋 Upload preset:', UPLOAD_PRESET);
      console.log('📁 Folder: safety_videos');
      console.log('📹 Video blob size:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('📹 Video blob type:', videoBlob.type);

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Video uploaded successfully:', result);

      if (result.error) {
        throw new Error(`Cloudinary error: ${result.error.message}`);
      }

      // Return the secure URL of the uploaded video
      return result.secure_url;

    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw error;
    }
  }

  // Get video blob from URL (for upload)
  async getVideoBlob(videoUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      fetch(videoUrl)
        .then(response => response.blob())
        .then(blob => resolve(blob))
        .catch(error => reject(error));
    });
  }

  // Clean up resources
  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}

// Export singleton instance
export const cloudinaryVideoService = new CloudinaryVideoServiceImpl();
