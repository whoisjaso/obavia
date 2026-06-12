import { Briefcase, UsersRound } from 'lucide-react';
import type { Vehicle } from '../data';

type VehicleCardProps = {
  vehicle: Vehicle;
  onOpen?: (id: string) => void;
};

export function VehicleCard({ vehicle, onOpen }: VehicleCardProps) {
  return (
    <article className="vehicle-card reveal">
      <button
        className="vehicle-media"
        type="button"
        onClick={() => onOpen?.(vehicle.id)}
        aria-label={`View ${vehicle.brand} ${vehicle.name}`}
      >
        <img src={vehicle.image} alt={`${vehicle.brand} ${vehicle.name}`} />
      </button>
      <div className="vehicle-copy">
        <p className="vehicle-brand">{vehicle.brand}</p>
        <h3>{vehicle.name}</h3>
        <p>or similar</p>
        <div className="spec-line" aria-label="Vehicle specifications">
          <span>
            <UsersRound size={15} strokeWidth={1.5} />
            {vehicle.seats} Seats
          </span>
          <span>
            <Briefcase size={15} strokeWidth={1.5} />
            {vehicle.bags} Bags
          </span>
        </div>
      </div>
    </article>
  );
}
