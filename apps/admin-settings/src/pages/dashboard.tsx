import { __ } from "@wordpress/i18n";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{__('Welcome to YayBoost', 'yayboost')}</h1>
        <p className="text-muted-foreground">{__('Encourage more sales with our suite of features', 'yayboost')}</p>
      </div>
    </div>
  );
}
