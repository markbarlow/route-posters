import { SiteHeader } from './components/site/SiteHeader';
import CreatePage from './pages/CreatePage';
import SamplesPage from './pages/SamplesPage';
import SplashPage from './pages/SplashPage';
import { useDocumentTitle, useRoute } from './router';

export default function App() {
  const route = useRoute();
  useDocumentTitle(route);

  // The editor owns the full viewport height, so its header lives inside the same fixed shell as
  // the workspace. The marketing pages scroll normally and keep the header in document flow.
  if (route === '/create') {
    return (
      <div className="editor-shell">
        <SiteHeader />
        <CreatePage />
      </div>
    );
  }

  return (
    <>
      <SiteHeader />
      {route === '/samples' ? <SamplesPage /> : <SplashPage />}
    </>
  );
}
