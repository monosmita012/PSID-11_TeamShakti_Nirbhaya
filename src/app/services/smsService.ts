import { ref, get } from "firebase/database";
import { database } from "../firebase-config";
import { getAuth } from "firebase/auth";

export interface SMSService {
  sendSMS: (phone: string, message: string) => Promise<boolean>;
  sendToGuardians: (location: { lat: number; lng: number; address?: string }) => Promise<{ success: boolean; sent: number; failed: number; details: string[] }>;
}

// SMS API Configuration - Using Fast2SMS (Free trial available)
// You need to register at https://www.fast2sms.com and get your API key
// Add this to your .env.local file: VITE_FAST2SMS_API_KEY=your_api_key_here
const SMS_API_KEY = import.meta.env.VITE_FAST2SMS_API_KEY || 'YOUR_FAST2SMS_API_KEY';
const SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';

// SMS Service using SMS API - AUTOMATIC sending without user intervention
class SMSServiceImpl implements SMSService {
  private async getGuardianNumbers(): Promise<string[]> {
    const auth = getAuth();
    if (!auth.currentUser) return [];

    try {
      const userRef = ref(database, `users/${auth.currentUser.uid}`);
      const snapshot = await get(userRef);
      const data = snapshot.val();
      
      console.log('🔍 Fetching user data from Firebase for guardian numbers...');
      console.log('📋 User data:', data);
      
      const numbers: string[] = [];
      
      // Primary guardian from registration
      if (data?.guardianPhone) {
        console.log('✅ Found primary guardian phone:', data.guardianPhone);
        numbers.push(this.formatPhoneNumber(data.guardianPhone));
      } else {
        console.warn('⚠️ No guardian phone found in registration data');
      }
      
      // Additional guardians
      if (data?.additionalGuardians) {
        console.log('✅ Found additional guardians:', data.additionalGuardians);
        Object.values(data.additionalGuardians).forEach((guardian: any) => {
          if (guardian?.phone) {
            console.log(`✅ Found additional guardian: ${guardian.name} - ${guardian.phone}`);
            numbers.push(this.formatPhoneNumber(guardian.phone));
          }
        });
      } else {
        console.warn('⚠️ No additional guardians found');
      }
      
      console.log(`📞 Total guardian numbers to send:`, numbers);
      
      return [...new Set(numbers)]; // Remove duplicates
    } catch (error) {
      console.error("Error fetching guardian numbers:", error);
      return [];
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add country code if missing (assuming India +91 for now)
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    
    // If already has country code
    if (cleaned.length > 10) {
      return `+${cleaned}`;
    }
    
    return cleaned;
  }

  private getCleanPhoneNumber(phone: string): string {
    // Remove +91 prefix for Fast2SMS (it requires 10 digit numbers)
    return phone.replace('+91', '').replace(/\D/g, '');
  }

  private createEmergencyMessage(location: { lat: number; lng: number; address?: string }, victimName: string): string {
    const mapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    let message = `🚨 EMERGENCY ALERT 🚨\n\n`;
    message += `${victimName} has triggered an emergency alert.\n\n`;
    message += `📍 Location: ${mapsLink}\n`;
    message += `🕐 Time: ${timestamp}\n`;
    
    if (location.address) {
      message += `📌 Address: ${location.address}\n`;
    }
    
    message += `\n⚠️ Please respond immediately or contact emergency services.\n`;
    message += `\n📱 Women Safety System Alert`;
    
    return message;
  }

  // AUTOMATIC SMS sending using Fast2SMS API only
  public async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      // Clean phone number (remove +91, get 10 digits)
      const cleanPhone = this.getCleanPhoneNumber(phone);
      
      console.log(`📱 Sending SMS automatically to: ${cleanPhone}`);
      console.log(`📝 Message: ${message}`);

      // Check if API key is configured
      if (SMS_API_KEY === 'YOUR_FAST2SMS_API_KEY') {
        console.error('❌ SMS API key not configured!');
        console.log('⚠️ To enable automatic SMS:');
        console.log('1. Register at https://www.fast2sms.com');
        console.log('2. Get your API key from dashboard');
        console.log('3. Add VITE_FAST2SMS_API_KEY=your_key to .env.local');
        return false;
      }

      // Fast2SMS API call - sends SMS automatically
      const params = new URLSearchParams({
        'authorization': "TRqwhavsnNWfIjEgUX6Ge0Pxl83JLMSi4dYmFKuck2ZQoz9Vt7k2A5PwKDWEVnSJQx9mHzGobjy4MOCB",
        'message': message,
        'language': 'english',
        'route': 'p', // Promotional route
        'numbers': cleanPhone,
        'flash': '0'
      });
      
      console.log('📤 Calling Fast2SMS API...');
      
      const response = await fetch(`${SMS_API_URL}?${params.toString()}`, {
        method: 'GET',
        headers: { 
          'cache-control': 'no-cache',
          'accept': 'application/json'
        }
      });

      const data = await response.json();
      console.log('📥 Fast2SMS API response:', data);

      // Check if SMS was sent successfully
      if (response.ok && (data.return === true || data.status_code === 200)) {
        console.log(`✅ SMS SENT SUCCESSFULLY to ${cleanPhone}`);
        return true;
      } else {
        console.error('❌ Fast2SMS API returned error:', data);
        return false;
      }
    } catch (error) {
      console.error("❌ SMS sending failed:", error);
      return false;
    }
  }

  // Send to all guardians automatically
  public async sendToGuardians(location: { lat: number; lng: number; address?: string }): Promise<{ success: boolean; sent: number; failed: number; details: string[] }> {
    const auth = getAuth();
    
    // Get victim name from profile first, fallback to displayName
    let victimName = auth.currentUser?.displayName || '';
    
    // Try to get name from user profile in Firebase
    try {
      if (auth.currentUser) {
        const userRef = ref(database, `users/${auth.currentUser.uid}`);
        const snapshot = await get(userRef);
        const data = snapshot.val();
        if (data?.name) {
          victimName = data.name;
        }
      }
    } catch (error) {
      console.warn("Could not fetch user profile for name:", error);
    }
    
    // Final fallback
    if (!victimName) {
      victimName = 'A victim';
    }
    
    console.log(`📱 Sending automatic SMS for victim: ${victimName}`);
    
    const guardianNumbers = await this.getGuardianNumbers();
    
    console.log(`📞 Found ${guardianNumbers.length} guardian number(s):`, guardianNumbers);
    
    if (guardianNumbers.length === 0) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        details: ['No guardian numbers found in profile. Please add emergency contacts in your Profile page.']
      };
    }

    const message = this.createEmergencyMessage(location, victimName);
    console.log(`📝 Message content:\n${message}`);
    
    let sent = 0;
    let failed = 0;
    const details: string[] = [];

    // Send to all guardians automatically
    for (const phone of guardianNumbers) {
      try {
        console.log(`📤 Sending automatic SMS to: ${phone}`);
        const success = await this.sendSMS(phone, message);
        if (success) {
          sent++;
          details.push(`✅ SMS SENT to ${phone}`);
        } else {
          failed++;
          details.push(`❌ SMS FAILED to ${phone} - Check API configuration`);
        }
      } catch (error) {
        failed++;
        details.push(`❌ ERROR sending to ${phone}: ${error}`);
      }
    }

    return {
      success: sent > 0,
      sent,
      failed,
      details
    };
  }
}

// Export singleton instance
export const smsService = new SMSServiceImpl();
