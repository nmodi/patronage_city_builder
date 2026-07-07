export type BuildingType =
  | "empty"
  | "residential"
  | "artist"
  | "materials"
  | "service"
  | "road"
  | "city"
  | "decoration";

export type ArtistType = "painter" | "sculptor" | "architect" | "illuminator";
export type ArtistRank = "apprentice" | "journeyman" | "master";

export interface Artist {
  id: string;
  name: string;
  type: ArtistType;
  rank: ArtistRank; // Phase 5 only ever spawns "apprentice"
  homeTileKey: string; // origin key "x,y" of the hosting atelier
}

export interface BuildingMetadata {
  type: BuildingType;
  id: string;
  name: string;
  baseCost: number;
  description?: string;
  size: {
    width: number;
    height: number;
    depth: number;
  };
  color: string;
  footprint: {
    width: number;
    depth: number;
  };
  generates?: {
    income?: number;
    inspiration?: number;
  };
  housing?: number;
  amenities?: number; // raises the population growth ceiling while staffed
  isHub?: boolean;
  workersRequired?: number;
  maxWorkers?: number;
  artistCapacity?: number; // how many artists this atelier can host
}
