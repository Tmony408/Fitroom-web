import { OrderStatus, PRODUCTION_STAGES } from '@/lib/api';

export default function StageBar({ status }: { status: OrderStatus }) {
  const idx = PRODUCTION_STAGES.indexOf(status);
  return (
    <div className="stage-bar">
      {PRODUCTION_STAGES.map((s, i) => (
        <div key={s} className={'stage ' + (idx > i ? 'done' : idx === i ? 'cur' : '')}>{s.replace('_', ' ')}</div>
      ))}
    </div>
  );
}
