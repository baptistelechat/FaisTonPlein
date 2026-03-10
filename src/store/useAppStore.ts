import { create } from 'zustand';

export type FuelType = 'E10' | 'SP98' | 'Gazole' | 'E85' | 'GPLc' | 'SP95';

export type FuelPrice = {
  fuel_type: FuelType;
  price: number;
  updated_at: string;
};

export type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  services: string[];
  address: string;
  prices: FuelPrice[];
};

type AppStore = {
  stations: Station[];
  isLoading: boolean;
  userLocation: [number, number] | null;
  selectedFuel: FuelType;
  searchQuery: string;
  selectedStation: Station | null;
  
  setStations: (stations: Station[]) => void;
  setIsLoading: (loading: boolean) => void;
  setUserLocation: (loc: [number, number] | null) => void;
  setSelectedFuel: (fuel: FuelType) => void;
  setSearchQuery: (query: string) => void;
  setSelectedStation: (station: Station | null) => void;
  fetchStations: () => Promise<void>;
};

const MOCK_STATIONS: Station[] = [
  {
    id: '1',
    name: 'TotalEnergies Access',
    lat: 48.8566,
    lon: 2.3522,
    services: ['Toilettes', 'Boutique', 'Lavage'],
    address: '10 Rue de Rivoli, 75001 Paris',
    prices: [
      { fuel_type: 'E10', price: 1.849, updated_at: '2026-03-10T08:00:00Z' },
      { fuel_type: 'Gazole', price: 1.745, updated_at: '2026-03-10T08:00:00Z' },
    ],
  },
  {
    id: '2',
    name: 'BP Paris Centre',
    lat: 48.8606,
    lon: 2.3376,
    services: ['Gonflage', 'Lavage', 'Aspirateur'],
    address: 'Place du Palais Royal, 75001 Paris',
    prices: [
      { fuel_type: 'SP98', price: 1.952, updated_at: '2026-03-10T09:00:00Z' },
      { fuel_type: 'E85', price: 0.849, updated_at: '2026-03-10T09:00:00Z' },
    ],
  },
  {
    id: '3',
    name: 'Shell Saint-Michel',
    lat: 48.8530,
    lon: 2.3499,
    services: ['Cafétéria', 'WIFI'],
    address: 'Boulevard Saint-Michel, 75005 Paris',
    prices: [
      { fuel_type: 'Gazole', price: 1.789, updated_at: '2026-03-10T07:30:00Z' },
      { fuel_type: 'E10', price: 1.899, updated_at: '2026-03-10T07:30:00Z' },
    ],
  },
];

export const useAppStore = create<AppStore>((set) => ({
  stations: [],
  isLoading: false,
  userLocation: null,
  selectedFuel: 'E10',
  searchQuery: '',
  selectedStation: null,

  setStations: (stations) => set({ stations }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setUserLocation: (userLocation) => set({ userLocation }),
  setSelectedFuel: (selectedFuel) => set({ selectedFuel }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedStation: (selectedStation) => set({ selectedStation }),

  fetchStations: async () => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 800));
    set({ stations: MOCK_STATIONS, isLoading: false });
  },
}));
