interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'sales' | 'stock' | 'alerts' | 'value';
  footer?: string;
}

export default function StatsCard({ label, value, icon, variant = 'default', footer }: StatsCardProps) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon ${variant}`}>{icon}</div>
      </div>
      <div className="stat-card-value">{value}</div>
      {footer && <div className="stat-card-footer">{footer}</div>}
    </div>
  );
}
