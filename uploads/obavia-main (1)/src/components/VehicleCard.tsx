import { CalendarDays, Gauge } from 'lucide-react';
import type { Vehicle } from '../data';

type VehicleCardProps = {
  vehicle: Vehicle;
  onOpen?: (id: string) => void;
};

export function VehicleCard({ vehicle, onOpen }: VehicleCardProps) {
  return (
    <article className="vehicle-card reveal">
      <button
        className="vehicle-ledger-media"
        type="button"
        onClick={() => onOpen?.(vehicle.id)}
        aria-label={`View ${vehicle.brand} ${vehicle.name}`}
      >
        <span>{vehicle.year}</span>
        <strong>{vehicle.brand}</strong>
        <small>{vehicle.publicStatus}</small>
      </button>
      <div className="vehicle-copy">
        <p className="vehicle-brand">{vehicle.brand}</p>
        <h3>{vehicle.name}{vehicle.trim ? ` ${vehicle.trim}` : ''}</h3>
        <p>{vehicle.category}</p>
        <div className="spec-line" aria-label="Vehicle specifications">
          <span>
            <CalendarDays size={15} strokeWidth={1.5} />
            {vehicle.rateLabel}
          </span>
          <span>
            <Gauge size={15} strokeWidth={1.5} />
            {vehicle.publicStatus}
          </span>
        </div>
      </div>
    </article>
  );
}
