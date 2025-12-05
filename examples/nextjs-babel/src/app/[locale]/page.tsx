import { init } from '../../i18n';
import ClientComponent from './client-component';
import ServerComponent from './server-component';

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  await init(locale);

  return (
    <main>
      <div style={{ border: '1px solid red' }}>
        <ServerComponent />
      </div>

      <div style={{ border: '1px solid blue' }}>
        <ClientComponent />
      </div>
    </main>
  );
}
