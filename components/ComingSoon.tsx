import Card from './Card';
import Icon from './Icon';

export default function ComingSoon({ note }: { note?: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-pill bg-neutral-100 flex items-center justify-center text-text-secondary">
        <Icon name="light-bulb" size={20} />
      </div>
      <div>
        <div className="type-h4">Coming up</div>
        <div className="type-body-sm text-text-secondary">
          {note ?? 'This view is part of the prototype scope. Building next.'}
        </div>
      </div>
    </Card>
  );
}
