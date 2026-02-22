import { useState, useRef, useEffect } from "react";
import { Square, Download, Trash2, Play, Pause, Video } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ref, set, get } from "firebase/database";
import { database } from "../firebase-config";
import { getAuth } from "firebase/auth";

interface Recording {
  id: string;
  sessionId: string;
  blob: Blob;
  url: string;
  timestamp: number;
  duration: number;
  size: number;
}

interface SessionRecorderProps {
  sessionId: string;
  isRecording: boolean;
  onRecordingChange: (recording: boolean) => void;
}

export default function SessionRecorder({ sessionId, isRecording, onRecordingChange }: SessionRecorderProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetchRecordings();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId]);

  const fetchRecordings = async () => {
    const auth = getAuth();
    if (!auth.currentUser || !sessionId) return;

    try {
      const recordingsRef = ref(database, `recordings/${auth.currentUser.uid}/${sessionId}`);
      const snapshot = await get(recordingsRef);
      const data = snapshot.val();
      
      if (data) {
        const recordingsList = Object.entries(data).map(([id, recording]: [string, any]) => ({
          id,
          ...recording
        })) as Recording[];
        
        setRecordings(recordingsList.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Get the remote video stream (what police sees)
      const remoteVideo = document.querySelector('video[ref="remoteVideoRef"]') as HTMLVideoElement;
      if (!remoteVideo || !remoteVideo.srcObject) {
        alert('No video stream available to record');
        return;
      }

      const stream = remoteVideo.srcObject as MediaStream;
      streamRef.current = stream;

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        const recording: Recording = {
          id: `recording_${Date.now()}`,
          sessionId,
          blob,
          url,
          timestamp: Date.now(),
          duration: recordingTime,
          size: blob.size
        };

        // Save to Firebase
        await saveRecording(recording);
        setRecordings(prev => [recording, ...prev]);
        setRecordingTime(0);
      };

      recorder.start();
      setMediaRecorder(recorder);
      onRecordingChange(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      onRecordingChange(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const saveRecording = async (recording: Recording) => {
    const auth = getAuth();
    if (!auth.currentUser) return;

    try {
      // Convert blob to base64 for Firebase storage
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        const recordingRef = ref(database, `recordings/${auth.currentUser.uid}/${sessionId}/${recording.id}`);
        await set(recordingRef, {
          id: recording.id,
          sessionId: recording.sessionId,
          data: base64data,
          timestamp: recording.timestamp,
          duration: recording.duration,
          size: recording.size,
          mimeType: 'video/webm'
        });
      };
      reader.readAsDataURL(recording.blob);
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };

  const downloadRecording = (recording: Recording) => {
    const a = document.createElement('a');
    a.href = recording.url;
    a.download = `emergency_session_${recording.sessionId.slice(-8)}_${new Date(recording.timestamp).toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const deleteRecording = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    const auth = getAuth();
    if (!auth.currentUser) return;

    try {
      const recordingRef = ref(database, `recordings/${auth.currentUser?.uid}/${sessionId}/${recordingId}`);
      await set(recordingRef, null);
      
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Session Recording
        </CardTitle>
        <CardDescription>
          Record emergency sessions for evidence and review
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4 p-4 border rounded-lg bg-gray-50">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              <Video className="w-4 h-4" />
              Start Recording
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
              </div>
              
              {!isPaused ? (
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={resumeRecording}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              )}
              
              <Button
                onClick={stopRecording}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop
              </Button>
            </div>
          )}
        </div>

        {/* Recordings List */}
        <div className="space-y-2">
          <h4 className="font-medium">Recorded Sessions</h4>
          
          {recordings.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border rounded-lg">
              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recordings yet</p>
              <p className="text-sm">Start recording to save emergency sessions</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recordings.map((recording) => (
                <div key={recording.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {formatTime(recording.duration)}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {formatFileSize(recording.size)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(recording.timestamp).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => downloadRecording(recording)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteRecording(recording.id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recording Info */}
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium mb-1">📹 Recording Information:</p>
          <ul className="space-y-1">
            <li>• Recordings are saved in WebM format (VP9 codec)</li>
            <li>• Maximum recording duration: 30 minutes</li>
            <li>• Recordings are stored securely and can be downloaded</li>
            <li>• Ensure you have permission to record video content</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
