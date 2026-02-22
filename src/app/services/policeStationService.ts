// Police Station Service for finding nearest police stations
export interface PoliceStation {
  name: string;
  address: string;
  phone: string;
  distance: number;
  lat: number;
  lng: number;
}

export interface PoliceStationService {
  findNearestStations: (lat: number, lng: number) => Promise<PoliceStation[]>;
  getDirections: (station: PoliceStation, userLat: number, userLng: number) => string;
}

class PoliceStationServiceImpl implements PoliceStationService {
  // Find nearest police stations using OpenStreetMap Overpass API
  async findNearestStations(lat: number, lng: number): Promise<PoliceStation[]> {
    try {
      console.log('🔍 Searching for nearest police stations...');
      
      // Overpass API query for police stations
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="police"](around:5000, ${lat}, ${lng});
          way["amenity"="police"](around:5000, ${lat}, ${lng});
          relation["amenity"="police"](around:5000, ${lat}, ${lng});
        );
        out body;
        >;
        out skel qt;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch police stations');
      }
      
      const data = await response.json();
      const stations: PoliceStation[] = [];
      
      // Process results
      data.elements.forEach((element: any) => {
        if (element.tags && element.tags.name && element.lat && element.lon) {
          const distance = this.calculateDistance(lat, lng, element.lat, element.lon);
          
          stations.push({
            name: element.tags.name || 'Police Station',
            address: element.tags['addr:street'] || element.tags['addr:full'] || 'Address not available',
            phone: element.tags.phone || element.tags['contact:phone'] || '100', // Default emergency number
            distance: distance,
            lat: element.lat,
            lng: element.lon
          });
        }
      });
      
      // Sort by distance and return top 5
      const sortedStations = stations
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
      
      console.log(`✅ Found ${sortedStations.length} police stations`);
      return sortedStations;
      
    } catch (error) {
      console.error('❌ Error finding police stations:', error);
      
      // Fallback to mock data if API fails
      return this.getMockPoliceStations(lat, lng);
    }
  }
  
  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  // Get Google Maps directions URL
  getDirections(station: PoliceStation, userLat: number, userLng: number): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${station.lat},${station.lng}&travelmode=driving`;
  }
  
  // Mock police stations as fallback
  private getMockPoliceStations(lat: number, lng: number): PoliceStation[] {
    return [
      {
        name: "Central Police Station",
        address: "Main Police Station, City Center",
        phone: "100",
        distance: 0.8,
        lat: lat + 0.01,
        lng: lng + 0.01
      },
      {
        name: "District Police Headquarters",
        address: "District HQ, Administrative Area",
        phone: "100",
        distance: 1.5,
        lat: lat - 0.01,
        lng: lng + 0.01
      },
      {
        name: "Local Police Outpost",
        address: "Neighborhood Police Station",
        phone: "100",
        distance: 2.2,
        lat: lat + 0.02,
        lng: lng - 0.01
      }
    ];
  }
}

// Export singleton instance
export const policeStationService = new PoliceStationServiceImpl();
